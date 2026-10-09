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
