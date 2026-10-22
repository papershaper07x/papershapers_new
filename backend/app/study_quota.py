"""Account allowance derived from durable results and active reservations."""
from datetime import UTC, datetime, timedelta
import hashlib
import json
import uuid

from .database import Database
from .observability import request_id

DAILY_AI_ALLOWANCE = 5


class DailyQuotaExceeded(RuntimeError):
    def __init__(self, now: datetime):
        reset = now.replace(hour=0, minute=0, second=0, microsecond=0) + timedelta(days=1)
        self.retry_after = max(1, int((reset - now).total_seconds()))
        super().__init__(
            "Your 5 daily AI slots are used by completed papers, completed feedback, or requests still in progress. "
            "Failed requests do not count. It resets at 00:00 UTC (05:30 India time). "
            "Check your saved papers and any requests still running before trying again."
        )


def require_capacity(database: Database, db, user_id: str, now: datetime) -> None:
    # Lock only this account on PostgreSQL. SQLite serialises short admission
    # transactions; no lock is held during provider/network calls.
    if database.engine == "postgresql":
        lock = int.from_bytes(hashlib.sha256(("study-quota:" + user_id).encode()).digest()[:8], signed=True)
        db.execute("SELECT pg_advisory_xact_lock(?)", (lock,))
    else:
        db.execute("BEGIN IMMEDIATE")
    start = now.date().isoformat()
    end = (now.date() + timedelta(days=1)).isoformat()
    # Queued jobs survive restarts and remain reserved until the worker settles
    # them. Synchronous calls/feedback have bounded leases for crash recovery.
    row = db.execute("""SELECT
        (SELECT COUNT(*) FROM generated_papers WHERE user_id = ?
         AND created_at >= ? AND created_at < ?
         AND (status IN ('generated', 'job-queued') OR status LIKE 'job-running:%'
              OR (status = 'direct-running' AND created_at >= ?)))
        + (SELECT COUNT(*) FROM paper_attempts WHERE user_id = ?
           AND started_at >= ? AND started_at < ?
           AND (status = 'reviewed' OR (status = 'quota-pending' AND started_at >= ?))) AS used""",
        (user_id, start, end, (now - timedelta(minutes=20)).isoformat(),
         user_id, start, end, (now - timedelta(minutes=5)).isoformat())).fetchone()
    if row["used"] >= DAILY_AI_ALLOWANCE:
        raise DailyQuotaExceeded(now)


def reserve_generation(database: Database, request, *, queued: bool) -> str:
    job_id = str(uuid.uuid4())
    now = datetime.now(UTC)
    with database.connect() as db:
        require_capacity(database, db, request.user_id, now)
        db.execute("INSERT INTO generated_papers (id, user_id, paper_size, board, grade, subject, chapters_json, provider, status, paper_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (job_id, request.user_id, request.paper_size, request.board, request.grade, request.subject,
                    json.dumps(request.chapters), "pending", "job-queued" if queued else "direct-running",
                    json.dumps({"request": request.model_dump(), "trace_id": request_id.get()}), now.isoformat()))
    return job_id


def reserve_assessment(database: Database, paper_id: str, request) -> tuple[str, str]:
    attempt_id = str(uuid.uuid4())
    now = datetime.now(UTC)
    with database.connect() as db:
        require_capacity(database, db, request.user_id, now)
        db.execute("INSERT INTO paper_attempts (id, paper_id, user_id, status, provider, answers_json, score_json, started_at, submitted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                   (attempt_id, paper_id, request.user_id, "quota-pending", "pending",
                    "[]", "{}", now.isoformat(), now.isoformat()))
    return attempt_id, now.isoformat()
