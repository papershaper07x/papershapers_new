from __future__ import annotations

import json
import asyncio
import logging
import re
import time
from dataclasses import dataclass
from collections.abc import Callable
from typing import Any

import httpx

from .config import Settings
from .database import Database
from .llm_budget import BudgetExhaustedError, reserve_provider_call
from .observability import event, elapsed

LOG = logging.getLogger("paper_backend.llm")


class GenerationUnavailableError(RuntimeError):
    """Raised when a real model is required but none can return a usable response."""


class GenerationConfigurationError(GenerationUnavailableError):
    """A local database setup failure; rotating provider keys cannot fix it."""


@dataclass
class GenerationResult:
    value: dict[str, Any]
    provider: str
    attempts: list[str]


def _extract_json(text: str) -> dict[str, Any]:
    cleaned = re.sub(r"^```(?:json)?\s*|\s*```$", "", text.strip(), flags=re.I)
    try:
        value = json.loads(cleaned)
    except json.JSONDecodeError:
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start < 0 or end <= start:
            raise ValueError("provider did not return a JSON object")
        value = json.loads(cleaned[start : end + 1])
    if not isinstance(value, dict):
        raise ValueError("provider returned JSON that is not an object")
    return value


class LLMRouter:
    def __init__(self, settings: Settings):
        self.settings = settings
        self._key_cursors = {"gemini": 0, "groq": 0, "nvidia": 0}
        self._groq_window_lock = asyncio.Lock()
        self._groq_last_started: float | None = None

    async def generate_json(self, *, system: str, prompt: str, fallback: dict[str, Any], transform: Callable[[dict[str, Any]], dict[str, Any]] | None = None, image_base64: str | None = None) -> GenerationResult:
        if not self.settings.llm_enabled:
            raise GenerationUnavailableError("AI requests are paused by the operator.")
        if len(system) + len(prompt) > self.settings.llm_max_input_chars:
            raise GenerationUnavailableError("This request is too large for AI review. Shorten the responses and try again.")
        if self.settings.llm_max_output_tokens <= 0 or self.settings.llm_max_attempts <= 0:
            raise GenerationUnavailableError("AI requests are paused by the operator.")
        # Per invocation, including key rotation and provider fallback.
        remaining = [self.settings.llm_max_attempts]
        attempts: list[str] = []
        for provider_index, provider in enumerate(self.settings.provider_order):
            if image_base64 and provider != "gemini":
                continue
            try:
                feedback = next((item.removeprefix("validation:") for item in reversed(attempts) if item.startswith("validation:")), None)
                provider_prompt = prompt + (f"\nValidation feedback from the previous response: {feedback}. Return a corrected complete JSON response for exactly the assigned slots." if feedback else "")
                # Reserve a chance for another configured vendor instead of
                # spending the entire retry budget on one vendor's key ring.
                later = self.settings.provider_order[provider_index + 1:]
                has_alternative = not image_base64 and any(getattr(self.settings, f"{p}_api_keys", ()) for p in later)
                key_limit = max(1, remaining[0] - 1) if has_alternative else None
                if provider == "gemini":
                    result = await self._generate_with_key_ring("gemini", system, provider_prompt, attempts, transform, remaining, image_base64, key_limit)
                elif provider == "groq":
                    result = await self._generate_with_key_ring("groq", system, provider_prompt, attempts, transform, remaining, key_limit=key_limit)
                elif provider == "nvidia":
                    result = await self._generate_with_key_ring("nvidia", system, provider_prompt, attempts, transform, remaining, key_limit=key_limit)
                elif provider == "mock":
                    if self.settings.allow_mock_fallback:
                        result = GenerationResult(fallback, "mock", attempts)
                    else:
                        attempts.append("mock:disabled")
                        continue
                else:
                    attempts.append(f"{provider}:unknown")
                    continue
                if transform is not None and provider == "mock":
                    result.value = transform(result.value)
                return result
            except GenerationConfigurationError:
                raise
            except BudgetExhaustedError as error:
                raise GenerationUnavailableError(str(error)) from error
            except Exception as error:
                attempts.append(f"{provider}:{type(error).__name__}")
                LOG.warning("LLM provider %s unavailable: %s", provider, type(error).__name__)
        if self.settings.allow_mock_fallback:
            return GenerationResult(fallback, "mock", attempts)
        raise GenerationUnavailableError("No configured language model could return a valid structured response. Check the provider keys, quota, and model names, then try again.")

    async def _generate_with_key_ring(self, provider: str, system: str, prompt: str, attempts: list[str], transform: Callable[[dict[str, Any]], dict[str, Any]] | None = None, remaining: list[int] | None = None, image_base64: str | None = None, key_limit: int | None = None) -> GenerationResult:
        keys = getattr(self.settings, f"{provider}_api_keys")
        if not keys:
            raise RuntimeError("provider key is not configured")
        start = self._key_cursors[provider] % len(keys)
        self._key_cursors[provider] += 1
        for offset in range(min(len(keys), key_limit) if key_limit is not None else len(keys)):
            if remaining is not None:
                if remaining[0] <= 0:
                    raise BudgetExhaustedError("The AI retry limit was reached. Please try again later.", scope="retry")
                remaining[0] -= 1
            index = (start + offset) % len(keys)
            started = time.perf_counter()
            try:
                response = await self._request_provider(provider, system, prompt, keys[index], image_base64=image_base64) if image_base64 else await self._request_provider(provider, system, prompt, keys[index])
                value = _extract_json(response)
                try:
                    validated = transform(value) if transform is not None else value
                except ValueError as error:
                    # Transform errors are our bounded schema checks, not raw
                    # provider text. Give the next attempt an actionable repair.
                    feedback = str(error)[:160]
                    attempts.append("validation:" + feedback)
                    LOG.warning("Structured response rejected: %s", feedback)
                    prompt += f"\nValidation feedback: {feedback}. Correct the response for the assigned slots."
                    raise
                result = GenerationResult(validated, provider, attempts)
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="completed", duration_ms=elapsed(started))
                return result
            except GenerationConfigurationError:
                raise
            except BudgetExhaustedError:
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="blocked", duration_ms=elapsed(started))
                raise
            except Exception as error:
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="failed", duration_ms=elapsed(started))
                # Store only ordinal/error class; never log or return a credential.
                attempts.append(f"{provider}:key-{index + 1}:{type(error).__name__}")
                LOG.warning("%s key slot %d unavailable: %s", provider.title(), index + 1, type(error).__name__)
                if isinstance(error, httpx.HTTPStatusError):
                    LOG.warning("%s request rejected with HTTP %d", provider.title(), error.response.status_code)
        raise GenerationUnavailableError(f"Every configured {provider.title()} key failed to return valid structured JSON.")

    async def _request_provider(self, provider: str, system: str, prompt: str, api_key: str, image_base64: str | None = None) -> str:
        if provider == "groq":
            await self._wait_for_groq_window()
        try:
            reserve_provider_call(Database(self.settings.db_path, self.settings.database_url), self.settings.llm_daily_call_limit, self.settings.llm_monthly_call_limit)
        except Exception as error:
            if getattr(error, "sqlstate", None) in {"42P01", "42501"}:
                raise GenerationConfigurationError("The AI budget table or runtime grants are missing. Apply migration 0008_llm_budget with the database owner and grant the backend SELECT/INSERT/UPDATE.") from error
            raise
        if provider == "gemini":
            return await self._gemini(system, prompt, api_key, image_base64=image_base64) if image_base64 else await self._gemini(system, prompt, api_key)
        if provider == "groq":
            return await self._openai_compatible("https://api.groq.com/openai/v1/chat/completions", self.settings.groq_model, system, prompt, api_key, reasoning_format="hidden", max_completion_tokens=self.settings.llm_max_output_tokens)
        if provider == "nvidia":
            return await self._openai_compatible("https://integrate.api.nvidia.com/v1/chat/completions", self.settings.nvidia_model, system, prompt, api_key)
        raise RuntimeError("unknown provider")

    async def _wait_for_groq_window(self) -> None:
        # Free-tier token throughput is shared by an organisation, not an API
        # key. Keep batches apart instead of rotating rapidly through keys.
        async with self._groq_window_lock:
            if self._groq_last_started is not None:
                delay = self.settings.groq_min_interval_seconds - (time.monotonic() - self._groq_last_started)
                if delay > 0:
                    await asyncio.sleep(delay)
            self._groq_last_started = time.monotonic()

    async def provider_status(self) -> dict[str, Any]:
        status: dict[str, Any] = {
            "order": list(self.settings.provider_order),
            "allow_mock_fallback": self.settings.allow_mock_fallback,
            "gemini": {"configured": bool(self.settings.gemini_api_keys), "key_count": len(self.settings.gemini_api_keys), "model": self.settings.gemini_model},
            "groq": {"configured": bool(self.settings.groq_api_keys), "key_count": len(self.settings.groq_api_keys), "model": self.settings.groq_model},
            "nvidia": {"configured": bool(self.settings.nvidia_api_keys), "key_count": len(self.settings.nvidia_api_keys), "model": self.settings.nvidia_model},
            "mock": {"configured": True},
        }
        return status

    async def _gemini(self, system: str, prompt: str, api_key: str, image_base64: str | None = None) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.gemini_model}:generateContent"
        parts = [{"text": prompt}]
        if image_base64:
            parts.append({"inline_data": {"mime_type": "image/webp", "data": image_base64}})
        generation_config = {"temperature": 0.2, "responseMimeType": "application/json", "maxOutputTokens": self.settings.llm_max_output_tokens}
        if self.settings.gemini_model.startswith("gemini-2.5-flash"):
            # Thinking consumes the same output budget as the JSON answer.
            # Reserve most tokens for complete question/subpart structures.
            generation_config["thinkingConfig"] = {"thinkingBudget": min(self.settings.gemini_thinking_budget, self.settings.llm_max_output_tokens // 4)}
        async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
            response = await client.post(url, headers={"x-goog-api-key": api_key, "Content-Type": "application/json"}, json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": generation_config,
            })
            response.raise_for_status()
            data = response.json()
            usage = data.get("usageMetadata") or {}
            event("llm.usage", operation="structured-generation", provider="gemini", input_tokens=usage.get("promptTokenCount"), output_tokens=usage.get("candidatesTokenCount"), total_tokens=usage.get("totalTokenCount"))
            parts = data["candidates"][0]["content"]["parts"]
            return "".join(part.get("text", "") for part in parts)

    async def _openai_compatible(self, url: str, model: str, system: str, prompt: str, api_key: str, *, reasoning_format: str | None = None, max_completion_tokens: int | None = None) -> str:
        payload: dict[str, Any] = {
            "model": model,
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
        }
        if reasoning_format is not None:
            payload["reasoning_format"] = reasoning_format
        if max_completion_tokens is not None:
            payload["max_completion_tokens"] = max_completion_tokens
        else:
            payload["max_tokens"] = self.settings.llm_max_output_tokens
        async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
            response = await client.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
            response.raise_for_status()
            data = response.json()
            usage = data.get("usage") or {}
            event("llm.usage", operation="structured-generation", provider="groq" if reasoning_format is not None else "nvidia", input_tokens=usage.get("prompt_tokens"), output_tokens=usage.get("completion_tokens"), total_tokens=usage.get("total_tokens"))
            content = data["choices"][0]["message"]["content"]
            if not isinstance(content, str):
                raise ValueError("provider did not return text content")
            return content
