import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime, timedelta
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import AsyncMock, patch

from backend.app.database import Database
from backend.app.schemas import StudyPaperRequest, StudyAttemptRequest
from backend.app.study import _save_paper, get_attempt, submit_attempt
from backend.app.study_jobs import enqueue, run_next, job_status
from backend.app.study_quota import DailyQuotaExceeded, reserve_assessment, reserve_generation
from backend.app.llm_budget import BudgetExhaustedError
from backend.app.llm_router import GenerationUnavailableError


class StudyQuotaTests(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Database(Path(self.temp.name) / 'quota.sqlite')
        self.db.initialize()
        self.request = StudyPaperRequest(user_id='account-a', grade='10', subject='Science', chapters=['Electricity'])
        self.router = SimpleNamespace(settings=SimpleNamespace(study_curriculum_csv_path=Path('unused'), allow_mock_fallback=True))

    def enqueue(self, user_id='account-a'):
        with patch('backend.app.study_jobs.validate_selection', return_value={'subject': 'Science', 'chapters': ['Electricity']}):
            return enqueue(self.db, self.router, self.request.model_copy(update={'user_id': user_id}))

    async def test_failed_jobs_never_exhaust_allowance_without_browser_polling(self):
        with patch('backend.app.study_jobs.generate_paper', new=AsyncMock(side_effect=RuntimeError('private key'))):
            for _ in range(7):
                job = self.enqueue()
                await run_next(self.db, self.router)
        error = job_status(self.db, job['id'], 'account-a')['error']
        self.assertIn('did not use your daily AI allowance', error)
        self.assertNotIn('private key', error)
        self.assertEqual(self.enqueue()['status'], 'queued')

    async def test_pending_jobs_are_reserved_atomically_and_accounts_are_isolated(self):
        def reserve(_):
            try:
                return reserve_generation(self.db, self.request, queued=True)
            except DailyQuotaExceeded:
                return None
        with ThreadPoolExecutor(max_workers=10) as pool:
            results = list(pool.map(reserve, range(15)))
        self.assertEqual(sum(value is not None for value in results), 5)
        self.assertEqual(self.enqueue('account-b')['status'], 'queued')
        with self.assertRaises(DailyQuotaExceeded):
            self.enqueue()

    async def test_successful_results_stay_charged_and_polling_does_not_charge_again(self):
        async def complete(db, router, request, *, job_id):
            return _save_paper(db, request, {'questions': []}, 'gemini', generation_source='fresh', job_id=job_id)
        with patch('backend.app.study_jobs.generate_paper', side_effect=complete):
            for _ in range(5):
                job = self.enqueue()
                await run_next(self.db, self.router)
                for _ in range(3):
                    self.assertEqual(job_status(self.db, job['id'], 'account-a')['status'], 'ready')
        with self.assertRaises(DailyQuotaExceeded):
            self.enqueue()

    async def test_generation_and_assessment_share_slots_and_failed_feedback_restores_capacity(self):
        paper = _save_paper(self.db, self.request, {'questions': []}, 'gemini', generation_source='fresh')
        for _ in range(3):
            self.enqueue()
        self.router.generate_json = AsyncMock(side_effect=RuntimeError('provider offline'))
        attempt = StudyAttemptRequest(user_id='account-a', answers=[])
        for _ in range(3):
            with self.assertRaisesRegex(RuntimeError, 'provider offline'):
                await submit_attempt(self.db, self.router, paper['id'], attempt)
        attempt_id, _ = reserve_assessment(self.db, paper['id'], attempt)
        self.assertIsNone(get_attempt(self.db, paper['id'], attempt_id, 'account-a'))
        with self.assertRaises(DailyQuotaExceeded):
            self.enqueue()

    async def test_old_failed_admission_counters_do_not_block_accounts_with_no_results(self):
        with self.db.connect() as db:
            db.execute('CREATE TABLE request_limits(key_hash TEXT PRIMARY KEY, window_start BIGINT, request_count INTEGER)')
            db.execute("INSERT INTO request_limits VALUES ('old-admission-counter', 0, 5)")
        self.assertEqual(self.enqueue()['status'], 'queued')

    async def test_previous_day_results_and_expired_sync_reservations_do_not_block(self):
        for _ in range(5):
            reserve_generation(self.db, self.request, queued=False)
        with self.db.connect() as db:
            db.execute('UPDATE generated_papers SET created_at = ?', ((datetime.now(UTC) - timedelta(minutes=21)).isoformat(),))
        self.assertEqual(self.enqueue()['status'], 'queued')
        with self.db.connect() as db:
            db.execute("UPDATE generated_papers SET status = 'generated', created_at = ?", ((datetime.now(UTC) - timedelta(days=1)).isoformat(),))
        self.assertEqual(self.enqueue()['status'], 'queued')

    async def test_quota_store_failure_does_not_allow_unmetered_work(self):
        with patch.object(self.db, 'connect', side_effect=RuntimeError('database offline')):
            with self.assertRaisesRegex(RuntimeError, 'database offline'):
                self.enqueue()

    async def test_exhausted_response_has_next_utc_reset(self):
        error = DailyQuotaExceeded(datetime(2026, 10, 22, 23, 59, tzinfo=UTC))
        self.assertEqual(error.retry_after, 60)
        self.assertIn('Failed requests do not count', str(error))

    async def test_provider_budget_and_account_allowance_are_not_confused(self):
        error = GenerationUnavailableError('site unavailable')
        error.__cause__ = BudgetExhaustedError('site budget exhausted')
        job = self.enqueue()
        with patch('backend.app.study_jobs.generate_paper', new=AsyncMock(side_effect=error)):
            await run_next(self.db, self.router)
        result = job_status(self.db, job['id'], 'account-a')
        self.assertIn("site's AI provider allowance", result['error'])
        self.assertIn('separate from your account', result['error'])
        self.assertEqual(self.enqueue()['status'], 'queued')

    async def test_cancelled_feedback_and_expired_assessment_reservations_release_slots(self):
        import asyncio
        paper = _save_paper(self.db, self.request, {'questions': []}, 'gemini', generation_source='fresh')
        attempt = StudyAttemptRequest(user_id='account-a', answers=[])
        self.router.generate_json = AsyncMock(side_effect=asyncio.CancelledError())
        with self.assertRaises(asyncio.CancelledError):
            await submit_attempt(self.db, self.router, paper['id'], attempt)
        for _ in range(4):
            reserve_assessment(self.db, paper['id'], attempt)
        with self.assertRaises(DailyQuotaExceeded):
            self.enqueue()
        with self.db.connect() as db:
            db.execute("UPDATE paper_attempts SET started_at = ? WHERE status = 'quota-pending'", ((datetime.now(UTC) - timedelta(minutes=6)).isoformat(),))
        self.assertEqual(self.enqueue()['status'], 'queued')

    async def test_http_quota_is_enforced_on_backend_and_returns_retry_after(self):
        from fastapi.testclient import TestClient
        from backend.app import main
        for _ in range(5):
            self.enqueue()
        with patch.object(main, 'database', self.db), patch.object(main, 'router', self.router), patch.object(main, 'settings', SimpleNamespace(shared_secret='test-only')):
            with patch('backend.app.study_jobs.validate_selection', return_value={'subject': 'Science', 'chapters': ['Electricity']}):
                client = TestClient(main.app, headers={'X-Backend-Secret': 'test-only'})
                response = client.post('/v1/study/generation-jobs', json=self.request.model_dump())
                self.assertEqual(response.status_code, 429)
                self.assertGreater(int(response.headers['Retry-After']), 0)
                self.assertIn('requests still in progress', response.json()['detail'])
                other = client.post('/v1/study/generation-jobs', json=self.request.model_copy(update={'user_id': 'account-b'}).model_dump())
                self.assertEqual(other.status_code, 202)
