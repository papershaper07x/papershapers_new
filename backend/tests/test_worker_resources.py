import asyncio
import unittest
from contextlib import suppress
from unittest.mock import patch
from backend.app import study_jobs


class WorkerResourceTests(unittest.IsolatedAsyncioTestCase):
    def test_idle_backoff_reaches_neon_sleep_window_and_stays_bounded(self):
        delay=1
        observed=[]
        for _ in range(12):
            delay=study_jobs.idle_delay(delay)
            observed.append(delay)
        self.assertEqual(observed[:3],[2,4,8])
        self.assertGreater(observed[-1],300)
        self.assertEqual(observed[-1],600)

    async def test_thread_enqueue_signal_wakes_an_idle_worker(self):
        called=0
        resumed=asyncio.Event()
        async def next_job(*args):
            nonlocal called
            called+=1
            if called>=2: resumed.set()
            return False
        with patch.object(study_jobs,'run_next',next_job):
            task=asyncio.create_task(study_jobs.worker(None,None))
            try:
                await asyncio.sleep(0)
                self.assertEqual(called,1)
                await asyncio.to_thread(study_jobs.wake_worker)
                await asyncio.wait_for(resumed.wait(),1)
                self.assertEqual(called,2)
            finally:
                task.cancel()
                with suppress(asyncio.CancelledError): await task
        self.assertIsNone(study_jobs._worker_event)
