from __future__ import annotations

import os
import tempfile
import unittest
import asyncio
from dataclasses import replace
from pathlib import Path
from unittest.mock import AsyncMock

os.environ["BACKEND_DB_PATH"] = str(Path(tempfile.mkdtemp()) / "test.db")
os.environ["LLM_PROVIDER_ORDER"] = "mock"
os.environ["ALLOW_MOCK_FALLBACK"] = "true"
os.environ["BACKEND_SHARED_SECRET"] = "backend-test-secret"

from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.curriculum import paper_guidance_for_selection
from backend.app.llm_router import LLMRouter
from backend.app.schemas import StudyPaperRequest
from backend.app.study import _generation_cache_key, _load_cached_paper, _store_cached_paper


class BackendContractTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.context = TestClient(app, headers={"X-Backend-Secret": "backend-test-secret"})
        cls.client = cls.context.__enter__()

    @classmethod
    def tearDownClass(cls) -> None:
        cls.context.__exit__(None, None, None)

    def test_health_reports_offline_fallback(self) -> None:
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["status"], "ok")
        self.assertTrue(payload["providers"]["mock"]["configured"])

    def test_study_generates_half_and_full_papers(self) -> None:
        catalog = self.client.get("/v1/study/catalog")
        self.assertEqual(catalog.status_code, 200)
        self.assertTrue(any(item["grade"] == "10" for item in catalog.json()["classes"]))
        grade = next(item for item in catalog.json()["classes"] if item["grade"] == "10")
        science = next(item for item in grade["subjects"] if item["subject"] == "Science")
        common = {"user_id": "test-user", "board": science["board"], "grade": "10", "subject": science["subject"], "chapters": science["chapters"][:2]}
        half = self.client.post("/v1/study/papers", json={**common, "paper_size": "half"})
        full = self.client.post("/v1/study/papers", json={**common, "paper_size": "full"})
        self.assertEqual(half.status_code, 200)
        self.assertEqual(full.status_code, 200)
        self.assertEqual(half.json()["paper"]["total_marks"], 40)
        self.assertEqual(full.json()["paper"]["total_marks"], 80)
        history_response = self.client.get("/v1/study/papers", params={"user_id": "test-user", "limit": 1})
        self.assertTrue(history_response.json()["has_more"])
        history = self.client.get("/v1/study/papers", params={"user_id": "test-user"}).json()["items"]
        self.assertEqual(len(history), 2)
        second_page = self.client.get("/v1/study/papers", params={"user_id": "test-user", "limit": 1, "offset": 1}).json()["items"]
        self.assertEqual(len(second_page), 1)
        paper_id = half.json()["paper"]["id"]
        paper = self.client.get(f"/v1/study/papers/{paper_id}", params={"user_id": "test-user"})
        self.assertEqual(paper.status_code, 200)
        questions = paper.json()["paper"]["paper"]["questions"]
        attempt = self.client.post(f"/v1/study/papers/{paper_id}/attempts", json={"user_id": "test-user", "answers": [{"question_id": questions[0]["id"], "answer": "I would begin by identifying the concept, showing each calculation step, and checking the conclusion against the evidence."}]})
        self.assertEqual(attempt.status_code, 200)
        self.assertEqual(attempt.json()["attempt"]["total_marks"], 40)
        self.assertEqual(attempt.json()["attempt"]["verification"]["status"], "local-rubric")
        first_review = attempt.json()["attempt"]["breakdown"][0]
        self.assertTrue(first_review["question_text"])
        self.assertIn("student_answer", first_review)
        attempt_id = attempt.json()["attempt"]["id"]
        result = self.client.get(f"/v1/study/papers/{paper_id}/attempts/{attempt_id}", params={"user_id": "test-user"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.json()["attempt"]["score"]["percentage"], attempt.json()["attempt"]["percentage"])

    def test_private_study_routes_reject_direct_backend_calls_without_the_shared_secret(self) -> None:
        with TestClient(app) as anonymous_client:
            response = anonymous_client.get("/v1/study/papers", params={"user_id": "test-user"})
        self.assertEqual(response.status_code, 401)

    def test_study_uses_local_paper_setting_guidance_when_available(self) -> None:
        from backend.app.main import settings

        guidance = paper_guidance_for_selection(settings.study_curriculum_csv_path, "CBSE", "10", "Science")
        self.assertIn("GUIDELINES FOR QUESTIONS", guidance)

    def test_gemini_key_ring_retries_the_next_key_after_a_failure(self) -> None:
        from backend.app.main import router

        test_router = LLMRouter(replace(router.settings, gemini_api_keys=("key-one", "key-two")))
        test_router._request_provider = AsyncMock(side_effect=[RuntimeError("quota"), '{"checked": true}'])
        result = asyncio.run(test_router._generate_with_key_ring("gemini", "system", "prompt", []))
        self.assertEqual(result.provider, "gemini")
        self.assertTrue(result.value["checked"])
        self.assertEqual(test_router._request_provider.await_count, 2)

    def test_provider_status_reports_configured_vendor_rings(self) -> None:
        from backend.app.main import router

        test_router = LLMRouter(replace(router.settings, groq_api_keys=("groq-dev",), nvidia_api_keys=("nvidia-dev",)))
        status = asyncio.run(test_router.provider_status())
        self.assertTrue(status["groq"]["configured"])
        self.assertEqual(status["nvidia"]["key_count"], 1)

    def test_router_tries_the_next_provider_when_the_first_json_fails_validation(self) -> None:
        from backend.app.main import router

        test_router = LLMRouter(replace(router.settings, provider_order=("gemini", "groq"), gemini_api_keys=("gemini-dev",), groq_api_keys=("groq-dev",)))
        test_router._request_provider = AsyncMock(side_effect=['{"questions": []}', '{"questions": ["valid"]}'])

        def require_questions(value: dict) -> dict:
            if not value.get("questions"):
                raise ValueError("questions missing")
            return value

        result = asyncio.run(test_router.generate_json(system="system", prompt="prompt", fallback={}, transform=require_questions))
        self.assertEqual(result.provider, "groq")
        self.assertEqual(test_router._request_provider.await_count, 2)

    def test_paper_cache_key_excludes_learner_identity_and_loaded_content_is_identity_free(self) -> None:
        from backend.app.main import database

        first = StudyPaperRequest(user_id="learner-a", board="CBSE", grade="10", subject="Science", chapters=["chapter-12 Electricity", "chapter-10 Light – Reflection and Refraction"], focus="Exam practice")
        second = StudyPaperRequest(user_id="learner-b", board="CBSE", grade="10", subject="Science", chapters=list(reversed(first.chapters)), focus="Exam practice")
        cache_key = _generation_cache_key(first, "test-cache-v1")
        self.assertEqual(cache_key, _generation_cache_key(second, "test-cache-v1"))
        _store_cached_paper(database, cache_key, {"title": "Validated study paper", "questions": []}, "gemini", 1)
        cached = _load_cached_paper(database, cache_key)
        self.assertIsNotNone(cached)
        self.assertEqual(cached["cached_from_provider"], "gemini")
        self.assertNotIn("user_id", cached)

    def test_owner_can_send_paper_feedback(self) -> None:
        catalog = self.client.get("/v1/study/catalog").json()
        grade = next(item for item in catalog["classes"] if item["grade"] == "10")
        science = next(item for item in grade["subjects"] if item["subject"] == "Science")
        common = {"user_id": "feedback-user", "board": science["board"], "grade": "10", "subject": science["subject"], "chapters": science["chapters"][:1], "paper_size": "half"}
        paper_id = self.client.post("/v1/study/papers", json=common).json()["paper"]["id"]
        response = self.client.post(f"/v1/study/papers/{paper_id}/feedback", json={"user_id": "feedback-user", "category": "wording", "comment": "One question needs clearer wording."})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["status"], "recorded")
        forbidden = self.client.post(f"/v1/study/papers/{paper_id}/feedback", json={"user_id": "another-user", "category": "wording", "comment": "Not my paper."})
        self.assertEqual(forbidden.status_code, 404)

    def test_news_fixture_and_three_lens_analysis(self) -> None:
        articles = self.client.get("/v1/news/articles").json()["items"]
        self.assertGreaterEqual(len(articles), 2)
        response = self.client.post("/v1/news/analyze", json={"article_id": articles[0]["id"]})
        self.assertEqual(response.status_code, 200)
        lenses = response.json()["analysis"]["lenses"]
        self.assertEqual(set(lenses), {"left", "centre", "right"})

    def test_marketplace_ranks_area_and_interest(self) -> None:
        response = self.client.get("/v1/marketplace/listings", params=[("area", "Indiranagar"), ("interests", "Food")])
        self.assertEqual(response.status_code, 200)
        items = response.json()["items"]
        self.assertGreater(len(items), 0)
        self.assertEqual(items[0]["area"], "Indiranagar")
        self.assertEqual(items[0]["category"], "Food")


if __name__ == "__main__":
    unittest.main()
