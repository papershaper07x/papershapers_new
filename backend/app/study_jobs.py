"""Durable generation on the API host; web requests only enqueue and poll."""
from __future__ import annotations

import asyncio
import json
import logging
import time
import uuid
from datetime import UTC, datetime

from .curriculum import validate_selection
from .database import Database
from .llm_router import LLMRouter
from .schemas import StudyPaperRequest
from .study import generate_paper

logger = logging.getLogger(__name__)
RUN_SECONDS = 240
LEASE_SECONDS = 300


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
    job_id = str(uuid.uuid4())
    with database.connect() as db:
        db.execute("INSERT INTO generated_papers (id, user_id, paper_size, board, grade, subject, chapters_json, provider, status, paper_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (job_id, request.user_id, request.paper_size, request.board, request.grade, request.subject, json.dumps(request.chapters), "pending", "job-queued", json.dumps({"request": request.model_dump()}), datetime.now(UTC).isoformat()))
    return {"id": job_id, "status": "queued"}


def job_status(database: Database, job_id: str, user_id: str) -> dict | None:
    with database.connect() as db:
        row = db.execute("SELECT status FROM generated_papers WHERE id = ? AND user_id = ?", (job_id, user_id)).fetchone()
    if not row:
        return None
    state = row["status"]
    if state == "generated":
        return {"id": job_id, "status": "ready", "paper_id": job_id}
    if state == "job-failed":
        return {"id": job_id, "status": "failed", "error": "We couldn’t finish this paper. Please try again."}
    return {"id": job_id, "status": "queued" if state == "job-queued" else "generating"}


async def run_next(database: Database, router: LLMRouter) -> bool:
    now = int(time.time())
    # Compare-and-swap claims also work when the API has multiple processes.
    with database.connect() as db:
        rows = db.execute("SELECT id, status, paper_json FROM generated_papers WHERE status = 'job-queued' OR status LIKE 'job-running:%' ORDER BY created_at LIMIT 100").fetchall()
        row = next((item for item in rows if item["status"] == "job-queued" or int(item["status"].split(":", 1)[1]) < now), None)
        if row is None:
            return False
        run_seconds = 900 if json.loads(row["paper_json"])["request"].get("mode") == "board-mock" else RUN_SECONDS
        claim = f"job-running:{now + run_seconds + 60}"
        changed = db.execute("UPDATE generated_papers SET status = ? WHERE id = ? AND status = ?", (claim, row["id"], row["status"])).rowcount
        if not changed:
            return False
    try:
        request = StudyPaperRequest.model_validate(json.loads(row["paper_json"])["request"])
        await asyncio.wait_for(generate_paper(database, router, request, job_id=row["id"]), run_seconds)
    except asyncio.CancelledError:
        # Graceful restarts release the job; crashes recover after the lease.
        with database.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'job-queued' WHERE id = ? AND status = ?", (row["id"], claim))
        raise
    except Exception as error:
        logger.warning("Generation job %s failed (%s)", row["id"], type(error).__name__)
        with database.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'job-failed' WHERE id = ? AND status = ?", (row["id"], claim))
    return True


async def worker(database: Database, router: LLMRouter) -> None:
    while True:
        try:
            if await run_next(database, router):
                continue
        except Exception as error:
            logger.warning("Generation worker unavailable (%s)", type(error).__name__)
        await asyncio.sleep(2)
