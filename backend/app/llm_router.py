from __future__ import annotations

import json
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
        for provider in self.settings.provider_order:
            if image_base64 and provider != "gemini":
                continue
            try:
                if provider == "gemini":
                    result = await self._generate_with_key_ring("gemini", system, prompt, attempts, transform, remaining, image_base64)
                elif provider == "groq":
                    result = await self._generate_with_key_ring("groq", system, prompt, attempts, transform, remaining)
                elif provider == "nvidia":
                    result = await self._generate_with_key_ring("nvidia", system, prompt, attempts, transform, remaining)
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
            except BudgetExhaustedError as error:
                raise GenerationUnavailableError(str(error)) from error
            except Exception as error:
                attempts.append(f"{provider}:{type(error).__name__}")
                LOG.warning("LLM provider %s unavailable: %s", provider, type(error).__name__)
        if self.settings.allow_mock_fallback:
            return GenerationResult(fallback, "mock", attempts)
        raise GenerationUnavailableError("No configured language model could return a valid structured response. Check the provider keys, quota, and model names, then try again.")

    async def _generate_with_key_ring(self, provider: str, system: str, prompt: str, attempts: list[str], transform: Callable[[dict[str, Any]], dict[str, Any]] | None = None, remaining: list[int] | None = None, image_base64: str | None = None) -> GenerationResult:
        keys = getattr(self.settings, f"{provider}_api_keys")
        if not keys:
            raise RuntimeError("provider key is not configured")
        start = self._key_cursors[provider] % len(keys)
        self._key_cursors[provider] += 1
        for offset in range(len(keys)):
            if remaining is not None:
                if remaining[0] <= 0:
                    raise BudgetExhaustedError("The AI retry limit was reached. Please try again later.")
                remaining[0] -= 1
            index = (start + offset) % len(keys)
            started = time.perf_counter()
            try:
                response = await self._request_provider(provider, system, prompt, keys[index], image_base64=image_base64) if image_base64 else await self._request_provider(provider, system, prompt, keys[index])
                value = _extract_json(response)
                result = GenerationResult(transform(value) if transform is not None else value, provider, attempts)
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="completed", duration_ms=elapsed(started))
                return result
            except BudgetExhaustedError:
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="blocked", duration_ms=elapsed(started))
                raise
            except Exception as error:
                event("llm.attempt", operation="structured-generation", provider=provider, outcome="failed", duration_ms=elapsed(started))
                # Store only ordinal/error class; never log or return a credential.
                attempts.append(f"{provider}:key-{index + 1}:{type(error).__name__}")
                LOG.warning("%s key slot %d unavailable: %s", provider.title(), index + 1, type(error).__name__)
        raise GenerationUnavailableError(f"Every configured {provider.title()} key failed to return valid structured JSON.")

    async def _request_provider(self, provider: str, system: str, prompt: str, api_key: str, image_base64: str | None = None) -> str:
        reserve_provider_call(Database(self.settings.db_path, self.settings.database_url), self.settings.llm_daily_call_limit, self.settings.llm_monthly_call_limit)
        if provider == "gemini":
            return await self._gemini(system, prompt, api_key, image_base64=image_base64) if image_base64 else await self._gemini(system, prompt, api_key)
        if provider == "groq":
            return await self._openai_compatible("https://api.groq.com/openai/v1/chat/completions", self.settings.groq_model, system, prompt, api_key, reasoning_format="hidden", max_completion_tokens=self.settings.llm_max_output_tokens)
        if provider == "nvidia":
            return await self._openai_compatible("https://integrate.api.nvidia.com/v1/chat/completions", self.settings.nvidia_model, system, prompt, api_key)
        raise RuntimeError("unknown provider")

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
        async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
            response = await client.post(url, headers={"x-goog-api-key": api_key, "Content-Type": "application/json"}, json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": parts}],
                "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json", "maxOutputTokens": self.settings.llm_max_output_tokens},
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
