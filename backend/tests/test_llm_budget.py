import asyncio
import tempfile
import unittest
from concurrent.futures import ThreadPoolExecutor
from dataclasses import replace
from datetime import UTC, datetime
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

from backend.app.config import Settings
from backend.app.database import Database
from backend.app.llm_budget import BudgetExhaustedError, reserve_provider_call
from backend.app.llm_router import GenerationUnavailableError, LLMRouter


class LLMBudgetTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.db = Database(Path(self.temp.name) / "budget.db")
        self.db.initialize()
        self.now = datetime(2026, 10, 11, tzinfo=UTC)

    def test_concurrent_workers_cannot_exceed_daily_limit(self):
        def reserve(_):
            try:
                reserve_provider_call(self.db, 3, 10, self.now)
                return True
            except BudgetExhaustedError:
                return False
        with ThreadPoolExecutor(max_workers=8) as pool:
            self.assertEqual(sum(pool.map(reserve, range(20))), 3)
        with self.db.connect() as db:
            self.assertEqual(db.execute("SELECT daily_calls, monthly_calls FROM llm_call_budget").fetchone()["monthly_calls"], 3)

    def test_daily_reset_does_not_reset_monthly_budget_and_restart_preserves_it(self):
        reserve_provider_call(self.db, 1, 2, self.now)
        next_day = datetime(2026, 10, 12, tzinfo=UTC)
        restarted = Database(self.db.path)
        reserve_provider_call(restarted, 1, 2, next_day)
        with self.assertRaises(BudgetExhaustedError):
            reserve_provider_call(restarted, 1, 2, datetime(2026, 10, 13, tzinfo=UTC))
        reserve_provider_call(restarted, 1, 2, datetime(2026, 11, 1, tzinfo=UTC))

    def test_zero_budget_blocks_first_call(self):
        with self.assertRaises(BudgetExhaustedError):
            reserve_provider_call(self.db, 0, 100, self.now)

    def test_all_provider_payloads_have_output_caps(self):
        router = self.router(llm_max_output_tokens=4096)
        response = MagicMock()
        response.json.return_value = {"candidates": [{"content": {"parts": [{"text": "{}"}]}}], "choices": [{"message": {"content": "{}"}}]}
        client = AsyncMock()
        client.post.return_value = response
        context = AsyncMock()
        context.__aenter__.return_value = client
        with patch("backend.app.llm_router.httpx.AsyncClient", return_value=context):
            asyncio.run(router._request_provider("gemini", "s", "p", "test"))
            self.assertEqual(client.post.call_args.kwargs["json"]["generationConfig"]["maxOutputTokens"], 4096)
            asyncio.run(router._request_provider("groq", "s", "p", "test"))
            self.assertEqual(client.post.call_args.kwargs["json"]["max_completion_tokens"], 4096)
            asyncio.run(router._request_provider("nvidia", "s", "p", "test"))
            self.assertEqual(client.post.call_args.kwargs["json"]["max_tokens"], 4096)

    def router(self, **changes):
        return LLMRouter(replace(Settings.from_env(), db_path=self.db.path, database_url=None, provider_order=("gemini", "groq"), gemini_api_keys=("test1", "test2", "test3"), groq_api_keys=("test4",), allow_mock_fallback=False, **changes))

    def test_retry_ceiling_includes_all_keys_and_providers(self):
        router = self.router(llm_max_attempts=2)
        router._request_provider = AsyncMock(side_effect=RuntimeError("provider failure"))
        with self.assertRaises(GenerationUnavailableError):
            asyncio.run(router.generate_json(system="s", prompt="p", fallback={}))
        self.assertEqual(router._request_provider.await_count, 2)

    def test_disabled_or_oversized_requests_never_call_provider(self):
        for settings in ({"llm_enabled": False}, {"llm_max_input_chars": 1}):
            router = self.router(**settings)
            router._request_provider = AsyncMock()
            with self.assertRaises(GenerationUnavailableError):
                asyncio.run(router.generate_json(system="s", prompt="p", fallback={}))
            router._request_provider.assert_not_awaited()

    def test_failed_network_call_consumes_budget_and_prevents_fallback_network_call(self):
        router = self.router(llm_daily_call_limit=1, llm_monthly_call_limit=1)
        router._gemini = AsyncMock(side_effect=RuntimeError("network failure"))
        router._openai_compatible = AsyncMock()
        with self.assertRaises(GenerationUnavailableError):
            asyncio.run(router.generate_json(system="s", prompt="p", fallback={}))
        self.assertEqual(router._gemini.await_count, 1)
        router._openai_compatible.assert_not_awaited()

    def test_gemini_flash_reserves_output_tokens_for_complete_json(self):
        router = self.router(llm_max_output_tokens=8192, gemini_model="gemini-2.5-flash", gemini_thinking_budget=4096)
        response = MagicMock()
        response.json.return_value = {"candidates": [{"content": {"parts": [{"text": "{}"}]}}]}
        client = AsyncMock()
        client.post.return_value = response
        context = AsyncMock()
        context.__aenter__.return_value = client
        with patch("backend.app.llm_router.httpx.AsyncClient", return_value=context):
            asyncio.run(router._gemini("system", "prompt", "test-only"))
        config = client.post.call_args.kwargs["json"]["generationConfig"]
        self.assertEqual(config["maxOutputTokens"], 8192)
        self.assertEqual(config["thinkingConfig"]["thinkingBudget"], 2048)
