import asyncio
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from backend.app.database import Database
from backend.app.schemas import StudyPaperRequest
from backend.app.study import _save_paper, get_paper, list_papers
from backend.app.study_jobs import enqueue, job_status, run_next


class GenerationJobTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Database(Path(self.temp.name) / "jobs.db")
        self.db.initialize()
        self.router = SimpleNamespace(settings=SimpleNamespace(study_curriculum_csv_path=Path("unused")))
        self.request = StudyPaperRequest(user_id="owner", grade="10", subject="Science", chapters=["Electricity"])
        with patch("backend.app.study_jobs.validate_selection", return_value={"subject": "Science", "chapters": ["Electricity"]}):
            self.job = enqueue(self.db, self.router, self.request)

    async def test_pending_job_is_private_and_not_a_readable_paper(self):
        self.assertIsNone(job_status(self.db, self.job["id"], "another-user"))
        self.assertEqual(job_status(self.db, self.job["id"], "owner")["status"], "queued")
        self.assertIsNone(get_paper(self.db, self.job["id"], "owner"))
        self.assertEqual(list_papers(self.db, "owner"), [])

    async def test_trace_survives_queue_restart_and_support_reference_matches_failure_log(self):
        import json
        import uuid
        from backend.app.observability import request_id
        trace = str(uuid.uuid4())
        with self.db.connect() as db:
            value = json.loads(db.execute("SELECT paper_json FROM generated_papers WHERE id = ?", (self.job["id"],)).fetchone()["paper_json"])
            value["trace_id"] = trace
            db.execute("UPDATE generated_papers SET paper_json = ? WHERE id = ?", (json.dumps(value), self.job["id"]))
        with self.assertLogs("paper_backend.trace", level="INFO") as captured, patch("backend.app.study_jobs.generate_paper", new=AsyncMock(side_effect=RuntimeError("private answer"))):
            await run_next(Database(self.db.path), self.router)
        records = [json.loads(row.message) for row in captured.records]
        self.assertTrue(all(row["requestId"] == trace for row in records))
        self.assertEqual(records[-1]["outcome"], "failed")
        self.assertIn(trace, job_status(self.db, self.job["id"], "owner")["error"])
        self.assertIsNone(request_id.get())

    async def test_completion_uses_same_id_and_cannot_be_claimed_twice(self):
        async def complete(db, router, request, *, job_id):
            return _save_paper(db, request, {"questions": []}, "gemini", generation_source="fresh", job_id=job_id)
        with patch("backend.app.study_jobs.generate_paper", side_effect=complete):
            self.assertTrue(await run_next(self.db, self.router))
            self.assertFalse(await run_next(self.db, self.router))
        self.assertEqual(job_status(self.db, self.job["id"], "owner")["paper_id"], self.job["id"])
        self.assertEqual(len(list_papers(self.db, "owner")), 1)

    async def test_slow_generation_can_be_polled_without_waiting_for_model(self):
        started, finish = asyncio.Event(), asyncio.Event()
        async def slow(db, router, request, *, job_id):
            started.set()
            await finish.wait()
            return _save_paper(db, request, {"questions": []}, "gemini", generation_source="fresh", job_id=job_id)
        with patch("backend.app.study_jobs.generate_paper", side_effect=slow):
            task = asyncio.create_task(run_next(self.db, self.router))
            await started.wait()
            self.assertEqual(job_status(self.db, self.job["id"], "owner")["status"], "generating")
            self.assertFalse(task.done())
            finish.set()
            await task
        self.assertEqual(job_status(self.db, self.job["id"], "owner")["status"], "ready")

    async def test_failure_has_safe_message_and_does_not_publish_a_paper(self):
        with patch("backend.app.study_jobs.generate_paper", new=AsyncMock(side_effect=RuntimeError("secret diagnostic"))):
            await run_next(self.db, self.router)
        result = job_status(self.db, self.job["id"], "owner")
        self.assertEqual(result["status"], "failed")
        self.assertNotIn("secret", result["error"])
        self.assertEqual(list_papers(self.db, "owner"), [])

    async def test_cancelled_worker_releases_claim_and_expired_lease_recovers(self):
        with patch("backend.app.study_jobs.generate_paper", new=AsyncMock(side_effect=asyncio.CancelledError())):
            with self.assertRaises(asyncio.CancelledError):
                await run_next(self.db, self.router)
        self.assertEqual(job_status(self.db, self.job["id"], "owner")["status"], "queued")
        with self.db.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'job-running:1' WHERE id = ?", (self.job["id"],))
        with patch("backend.app.study_jobs.generate_paper", new=AsyncMock(side_effect=RuntimeError())):
            self.assertTrue(await run_next(self.db, self.router))

    async def test_paid_queue_priority_and_aging_protect_free_jobs(self):
        from datetime import UTC, datetime, timedelta
        with self.db.connect() as db:
            db.execute("CREATE TABLE billing_orders(user_id TEXT, kind TEXT, status TEXT, expires_at TEXT)")
            db.execute("INSERT INTO billing_orders VALUES (?, 'membership', 'paid', ?)", ("paid-owner", (datetime.now(UTC) + timedelta(days=1)).isoformat()))
        with patch("backend.app.study_jobs.validate_selection", return_value={"subject": "Science", "chapters": ["Electricity"]}):
            paid = enqueue(self.db, self.router, self.request.model_copy(update={"user_id": "paid-owner"}))
        generated = AsyncMock(side_effect=RuntimeError("test only"))
        with patch.dict("os.environ", {"BILLING_ENABLED": "true"}), patch("backend.app.study_jobs.generate_paper", new=generated):
            await run_next(self.db, self.router)
            self.assertEqual(generated.call_args.kwargs["job_id"], paid["id"])
        with self.db.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'job-queued' WHERE id = ?", (paid["id"],))
            db.execute("UPDATE generated_papers SET created_at = ? WHERE id = ?", ((datetime.now(UTC) - timedelta(minutes=11)).isoformat(), self.job["id"]))
        with patch.dict("os.environ", {"BILLING_ENABLED": "true"}), patch("backend.app.study_jobs.generate_paper", new=generated):
            await run_next(self.db, self.router)
            self.assertEqual(generated.call_args.kwargs["job_id"], self.job["id"])
