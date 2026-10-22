"""Allowlisted operational events; no request/response bodies or raw URLs."""
import json
import logging
import sys
import time
import uuid
from contextvars import ContextVar
from datetime import UTC, datetime

request_id = ContextVar("request_id", default=None)
log = logging.getLogger("paper_backend.trace")
log.propagate = False
if not log.handlers:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(logging.Formatter("%(message)s"))
    log.addHandler(handler)
log.setLevel(logging.INFO)


def valid_trace_id(value):
    try:
        return str(uuid.UUID(value))
    except (ValueError, TypeError, AttributeError):
        return str(uuid.uuid4())


def event(name, *, operation, status=None, duration_ms=None, provider=None, outcome=None, input_tokens=None, output_tokens=None, total_tokens=None, queue_ms=None):
    payload = {"schema": 1, "service": "backend", "event": name, "timestamp": datetime.now(UTC).isoformat(), "requestId": request_id.get(), "operation": operation}
    for key, value in {"status": status, "durationMs": duration_ms, "inputTokens": input_tokens, "outputTokens": output_tokens, "totalTokens": total_tokens, "queueMs": queue_ms}.items():
        if isinstance(value, (int, float)) and 0 <= value < 1_000_000_000:
            payload[key] = round(value)
    if provider in {"gemini", "groq", "nvidia", "mock", "cache"}:
        payload["provider"] = provider
    if outcome in {"started", "queued", "completed", "failed", "cancelled", "blocked"}:
        payload["outcome"] = outcome
    log.info(json.dumps(payload, separators=(",", ":")))


def elapsed(started):
    return (time.perf_counter() - started) * 1000
