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
    database_url: str | None
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
    allow_mock_fallback: bool
    study_curriculum_csv_path: Path
    study_generation_cache_version: str
    study_generation_cache_hours: int
    llm_max_output_tokens: int = 8192
    llm_max_input_chars: int = 60000
    llm_max_attempts: int = 2
    llm_daily_call_limit: int = 20
    llm_monthly_call_limit: int = 100
    llm_enabled: bool = True
    groq_min_interval_seconds: float = 60.0
    gemini_thinking_budget: int = 1024

    @classmethod
    def from_env(cls) -> "Settings":
        return cls(
            host=os.getenv("BACKEND_HOST", "127.0.0.1"),
            port=int(os.getenv("PORT", os.getenv("BACKEND_PORT", "8000"))),
            db_path=Path(os.getenv("BACKEND_DB_PATH", "backend/data/papershapers.db")),
            database_url=os.getenv("DATABASE_URL") or None,
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
            allow_mock_fallback=os.getenv("ALLOW_MOCK_FALLBACK", "false").lower() in {"1", "true", "yes"},
            study_curriculum_csv_path=Path(os.getenv("STUDY_CURRICULUM_CSV_PATH", "data/study-source/text_files_data2.csv")),
            study_generation_cache_version=os.getenv("STUDY_GENERATION_CACHE_VERSION", "2026-09-source-v1"),
            study_generation_cache_hours=max(1, int(os.getenv("STUDY_GENERATION_CACHE_HOURS", "336"))),
            llm_max_output_tokens=int(os.getenv("LLM_MAX_OUTPUT_TOKENS", "8192")),
            llm_max_input_chars=int(os.getenv("LLM_MAX_INPUT_CHARS", "60000")),
            llm_max_attempts=int(os.getenv("LLM_MAX_ATTEMPTS", "2")),
            llm_daily_call_limit=int(os.getenv("LLM_DAILY_CALL_LIMIT", "20")),
            llm_monthly_call_limit=int(os.getenv("LLM_MONTHLY_CALL_LIMIT", "100")),
            llm_enabled=os.getenv("LLM_ENABLED", "true").lower() == "true",
            groq_min_interval_seconds=max(0, min(120, float(os.getenv("GROQ_MIN_INTERVAL_SECONDS", "60")))),
            gemini_thinking_budget=max(0, min(4096, int(os.getenv("GEMINI_THINKING_BUDGET", "1024")))),
        )
