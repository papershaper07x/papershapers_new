from __future__ import annotations

import json
import logging
import re
from dataclasses import dataclass
from collections.abc import Callable
from typing import Any

import httpx

from .config import Settings

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

    async def generate_json(self, *, system: str, prompt: str, fallback: dict[str, Any], transform: Callable[[dict[str, Any]], dict[str, Any]] | None = None) -> GenerationResult:
        attempts: list[str] = []
        for provider in self.settings.provider_order:
            try:
                if provider == "gemini":
                    result = await self._generate_with_key_ring("gemini", system, prompt, attempts, transform)
                elif provider == "groq":
                    result = await self._generate_with_key_ring("groq", system, prompt, attempts, transform)
                elif provider == "nvidia":
                    result = await self._generate_with_key_ring("nvidia", system, prompt, attempts, transform)
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
            except Exception as error:
                attempts.append(f"{provider}:{type(error).__name__}")
                LOG.warning("LLM provider %s unavailable: %s", provider, type(error).__name__)
        if self.settings.allow_mock_fallback:
            return GenerationResult(fallback, "mock", attempts)
        raise GenerationUnavailableError("No configured language model could return a valid structured response. Check the provider keys, quota, and model names, then try again.")

    async def _generate_with_key_ring(self, provider: str, system: str, prompt: str, attempts: list[str], transform: Callable[[dict[str, Any]], dict[str, Any]] | None = None) -> GenerationResult:
        keys = getattr(self.settings, f"{provider}_api_keys")
        if not keys:
            raise RuntimeError("provider key is not configured")
        start = self._key_cursors[provider] % len(keys)
        self._key_cursors[provider] += 1
        for offset in range(len(keys)):
            index = (start + offset) % len(keys)
            try:
                value = _extract_json(await self._request_provider(provider, system, prompt, keys[index]))
                return GenerationResult(transform(value) if transform is not None else value, provider, attempts)
            except Exception as error:
                # Store only ordinal/error class; never log or return a credential.
                attempts.append(f"{provider}:key-{index + 1}:{type(error).__name__}")
                LOG.warning("%s key slot %d unavailable: %s", provider.title(), index + 1, type(error).__name__)
        raise GenerationUnavailableError(f"Every configured {provider.title()} key failed to return valid structured JSON.")

    async def _request_provider(self, provider: str, system: str, prompt: str, api_key: str) -> str:
        if provider == "gemini":
            return await self._gemini(system, prompt, api_key)
        if provider == "groq":
            return await self._openai_compatible("https://api.groq.com/openai/v1/chat/completions", self.settings.groq_model, system, prompt, api_key, reasoning_format="hidden", max_completion_tokens=8192)
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

    async def _gemini(self, system: str, prompt: str, api_key: str) -> str:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{self.settings.gemini_model}:generateContent"
        async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
            response = await client.post(url, headers={"x-goog-api-key": api_key, "Content-Type": "application/json"}, json={
                "systemInstruction": {"parts": [{"text": system}]},
                "contents": [{"role": "user", "parts": [{"text": prompt}]}],
                "generationConfig": {"temperature": 0.2, "responseMimeType": "application/json"},
            })
            response.raise_for_status()
            parts = response.json()["candidates"][0]["content"]["parts"]
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
        async with httpx.AsyncClient(timeout=self.settings.timeout_seconds) as client:
            response = await client.post(url, headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=payload)
            response.raise_for_status()
            content = response.json()["choices"][0]["message"]["content"]
            if not isinstance(content, str):
                raise ValueError("provider did not return text content")
            return content
