"""Durable generation on the API host; web requests only enqueue and poll."""
from __future__ import annotations

import asyncio
import json
import logging
import os
import time
from datetime import UTC, datetime

from .curriculum import validate_selection
from .database import Database
from .llm_router import LLMRouter, GenerationUnavailableError
from .schemas import StudyPaperRequest
from .study import generate_paper
from .study_quota import reserve_generation
from .llm_budget import BudgetExhaustedError
from .observability import event, elapsed, request_id, valid_trace_id

logger = logging.getLogger(__name__)
RUN_SECONDS = 240
LEASE_SECONDS = 300
_worker_loop: asyncio.AbstractEventLoop | None = None
_worker_event: asyncio.Event | None = None


def wake_worker() -> None:
    if _worker_loop is not None and _worker_event is not None and _worker_loop.is_running():
        try:
            _worker_loop.call_soon_threadsafe(_worker_event.set)
        except RuntimeError:
            pass  # A concurrent shutdown is safe: the committed job remains durable.


def idle_delay(previous: float) -> float:
    return min(max(previous * 2, 2), 600)


def enqueue(database: Database, router: LLMRouter, request: StudyPaperRequest) -> dict:
    if request.mode == "board-mock":
        from .board_mock import sources
        from .board_profiles import profile
        profile(request.grade, request.subject, request.board, request.academic_session)
        sources(router.settings.study_curriculum_csv_path, request.grade)
        request = request.model_copy(update={"paper_size": "full", "chapters": []})
    else:
        selected = validate_selection(router.settings.study_curriculum_csv_path, request.board, request.grade, request.subject, request.chapters)
        request = request.model_copy(update={"subject": selected["subject"], "chapters": selected["chapters"]})
    job_id = reserve_generation(database, request, queued=True)
    event("generation.job", operation="study.generation", outcome="queued")
    wake_worker()
    return {"id": job_id, "status": "queued"}


def job_status(database: Database, job_id: str, user_id: str) -> dict | None:
    with database.connect() as db:
        row = db.execute("SELECT status, paper_json FROM generated_papers WHERE id = ? AND user_id = ?", (job_id, user_id)).fetchone()
    if not row:
        return None
    state = row["status"]
    if state == "generated":
        return {"id": job_id, "status": "ready", "paper_id": job_id}
    if state == "job-failed":
        metadata = json.loads(row["paper_json"])
        trace_id = metadata.get("trace_id")
        reference = f" Support reference: {valid_trace_id(trace_id)}." if trace_id else ""
        messages = {
            "provider-budget": "The site's AI provider allowance is exhausted. This is separate from your account allowance. Please try after the site allowance resets.",
            "provider-unavailable": "The AI providers could not produce a valid paper. The service needs its provider configuration or availability checked before retrying.",
        }
        message = messages.get(metadata.get("failure"), "We couldn’t finish this paper. Please try again.")
        return {"id": job_id, "status": "failed", "error": message + " This failed request did not use your daily AI allowance." + reference}
    return {"id": job_id, "status": "queued" if state == "job-queued" else "generating"}


async def run_next(database: Database, router: LLMRouter) -> bool:
    now = int(time.time())
    # Compare-and-swap claims also work when the API has multiple processes.
    with database.connect() as db:
        # Paid requests may move ahead of recent free requests. After ten
        # minutes every request ranks by age, preventing free-tier starvation.
        order = "g.created_at"
        params = ()
        if os.environ.get("BILLING_ENABLED") == "true":
            order = """CASE WHEN g.created_at <= ? THEN 0
                WHEN EXISTS (SELECT 1 FROM billing_orders b WHERE b.user_id = g.user_id
                AND b.kind = 'membership' AND b.status = 'paid' AND b.expires_at > ?) THEN 1
                ELSE 2 END, g.created_at"""
            params = (datetime.fromtimestamp(now - 600, UTC).isoformat(), datetime.fromtimestamp(now, UTC).isoformat())
        rows = db.execute(f"SELECT g.id, g.status, g.paper_json, g.created_at FROM generated_papers g WHERE g.status = 'job-queued' OR (g.status LIKE 'job-running:%' AND CAST(SUBSTR(g.status, 13) AS INTEGER) < ?) ORDER BY {order} LIMIT 1", (now, *params)).fetchall()
        row = rows[0] if rows else None
        if row is None:
            return False
        run_seconds = 900 if json.loads(row["paper_json"])["request"].get("mode") == "board-mock" else RUN_SECONDS
        claim = f"job-running:{now + run_seconds + 60}"
        changed = db.execute("UPDATE generated_papers SET status = ? WHERE id = ? AND status = ?", (claim, row["id"], row["status"])).rowcount
        if not changed:
            return False
    trace_token = request_id.set(valid_trace_id(json.loads(row["paper_json"]).get("trace_id")))
    started = time.perf_counter()
    queued_at = row["created_at"]
    queued_at = datetime.fromisoformat(queued_at) if isinstance(queued_at, str) else queued_at
    event("generation.job", operation="study.generation", outcome="started", queue_ms=(datetime.now(UTC) - queued_at).total_seconds() * 1000)
    try:
        request = StudyPaperRequest.model_validate(json.loads(row["paper_json"])["request"])
        await asyncio.wait_for(generate_paper(database, router, request, job_id=row["id"]), run_seconds)
        event("generation.job", operation="study.generation", outcome="completed", duration_ms=elapsed(started))
    except asyncio.CancelledError:
        event("generation.job", operation="study.generation", outcome="cancelled", duration_ms=elapsed(started))
        # Graceful restarts release the job; crashes recover after the lease.
        with database.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'job-queued' WHERE id = ? AND status = ?", (row["id"], claim))
        raise
    except Exception as error:
        event("generation.job", operation="study.generation", outcome="failed", duration_ms=elapsed(started))
        with database.connect() as db:
            metadata = json.loads(row["paper_json"])
            site_budget_exhausted = isinstance(error.__cause__, BudgetExhaustedError) and error.__cause__.scope == "site"
            metadata["failure"] = "provider-budget" if site_budget_exhausted else "provider-unavailable" if isinstance(error, GenerationUnavailableError) else "generation-failed"
            db.execute("UPDATE generated_papers SET status = 'job-failed', paper_json = ? WHERE id = ? AND status = ?", (json.dumps(metadata), row["id"], claim))
    finally:
        request_id.reset(trace_token)
    return True


async def worker(database: Database, router: LLMRouter) -> None:
    global _worker_loop, _worker_event
    _worker_loop = asyncio.get_running_loop()
    signal = asyncio.Event()
    _worker_event = signal
    delay = 1.0
    try:
        while True:
            signal.clear()
            try:
                if await run_next(database, router):
                    delay = 1.0
                    continue
            except Exception as error:
                logger.warning("Generation worker unavailable (%s)", type(error).__name__)
            delay = idle_delay(delay)
            try:
                await asyncio.wait_for(signal.wait(), timeout=delay)
                delay = 1.0
            except TimeoutError:
                pass
    finally:
        if _worker_event is signal:
            _worker_event = None
            _worker_loop = None
