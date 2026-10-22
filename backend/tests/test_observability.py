import json
import unittest
import uuid

from fastapi.testclient import TestClient
from backend.app.observability import event, request_id


class TraceTests(unittest.TestCase):
    def test_middleware_uses_route_templates_and_ignores_untrusted_id(self):
        from backend.app.main import app
        incoming = str(uuid.uuid4())
        with self.assertLogs("paper_backend.trace", level="INFO") as captured:
            response = TestClient(app).get("/v1/study/papers/private-paper?user_id=private-student", headers={"X-Request-ID": incoming})
        self.assertNotEqual(response.headers["X-Request-ID"], incoming)
        data = json.loads(captured.records[-1].message)
        self.assertEqual(data["operation"], "/v1/study/papers/{paper_id}")
        self.assertNotIn("private", captured.records[-1].message)

    def test_authenticated_service_id_is_forwarded_without_logging_query_or_secret(self):
        from backend.app.main import app, settings
        incoming = str(uuid.uuid4())
        with self.assertLogs("paper_backend.trace", level="INFO") as captured:
            response = TestClient(app).get("/missing?secret=private", headers={"X-Request-ID": incoming, "X-Backend-Secret": settings.shared_secret})
        self.assertEqual(response.headers["X-Request-ID"], incoming)
        data = json.loads(captured.records[-1].message)
        self.assertEqual(data["operation"], "unmatched")
        self.assertNotIn("private", captured.records[-1].message)

    def test_event_omits_unknown_provider_and_invalid_numeric_usage(self):
        token = request_id.set(str(uuid.uuid4()))
        try:
            with self.assertLogs("paper_backend.trace", level="INFO") as captured:
                event("llm.usage", operation="structured-generation", provider="private-secret", input_tokens=-1, output_tokens=float("nan"))
            data = json.loads(captured.records[0].message)
            self.assertNotIn("provider", data)
            self.assertNotIn("inputTokens", data)
            self.assertNotIn("outputTokens", data)
        finally:
            request_id.reset(token)
