from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path


def _load_local_env() -> None:
    path = Path("backend/.env")
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if key and key.replace("_", "").isalnum():
            os.environ.setdefault(key, value.strip().strip('"').strip("'"))


_load_local_env()


def _split(value: str) -> tuple[str, ...]:
    return tuple(item.strip() for item in value.split(",") if item.strip())


@dataclass(frozen=True)
class Settings:
    host: str
    port: int
    db_path: Path
    allowed_origins: tuple[str, ...]
    shared_secret: str | None
    provider_order: tuple[str, ...]
    timeout_seconds: float
    gemini_api_keys: tuple[str, ...]
    gemini_model: str
    groq_api_keys: tuple[str, ...]
    groq_model: str
    nvidia_api_keys: tuple[str, ...]
    nvidia_model: str
    news_rss_feeds: tuple[str, ...]
    allow_mock_fallback: bool
    study_curriculum_csv_path: Path
    study_generation_cache_version: str
    study_generation_cache_hours: int

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            host=os.getenv("BACKEND_HOST", "127.0.0.1"),
            port=int(os.getenv("BACKEND_PORT", "8000")),
            db_path=Path(os.getenv("BACKEND_DB_PATH", "backend/data/papershapers.db")),
            allowed_origins=_split(os.getenv("BACKEND_ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001")),
            shared_secret=os.getenv("BACKEND_SHARED_SECRET") or None,
            provider_order=_split(os.getenv("LLM_PROVIDER_ORDER", "gemini,groq,nvidia")),
            timeout_seconds=float(os.getenv("LLM_TIMEOUT_SECONDS", "45")),
            gemini_api_keys=_split(os.getenv("GEMINI_API_KEYS", os.getenv("GEMINI_API_KEY", ""))),
            gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.5-flash"),
            groq_api_keys=_split(os.getenv("GROQ_API_KEYS", os.getenv("GROQ_API_KEY", ""))),
            groq_model=os.getenv("GROQ_MODEL", "openai/gpt-oss-20b"),
            nvidia_api_keys=_split(os.getenv("NVIDIA_API_KEYS", os.getenv("NVIDIA_API_KEY", ""))),
            nvidia_model=os.getenv("NVIDIA_MODEL", "nvidia/nemotron-3-super-120b-a12b"),
            news_rss_feeds=_split(os.getenv("NEWS_RSS_FEEDS", "")),
            allow_mock_fallback=os.getenv("ALLOW_MOCK_FALLBACK", "false").lower() in {"1", "true", "yes"},
            study_curriculum_csv_path=Path(os.getenv("STUDY_CURRICULUM_CSV_PATH", "papershapers/text_files_data2.csv")),
            study_generation_cache_version=os.getenv("STUDY_GENERATION_CACHE_VERSION", "2026-09-source-v1"),
            study_generation_cache_hours=max(1, int(os.getenv("STUDY_GENERATION_CACHE_HOURS", "336"))),
        )
