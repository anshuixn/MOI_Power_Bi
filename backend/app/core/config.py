from __future__ import annotations

from dataclasses import dataclass, field
from functools import lru_cache
import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv(Path(__file__).resolve().parents[2] / ".env")


@dataclass(frozen=True)
class Settings:
    app_name: str = "ReviewBand API"
    frontend_url: str = field(
        default_factory=lambda: os.getenv("FRONTEND_URL", "http://localhost:5173")
    )
    supabase_url: str = field(default_factory=lambda: os.getenv("SUPABASE_URL", ""))
    supabase_anon_key: str = field(
        default_factory=lambda: os.getenv(
            "SUPABASE_PUBLISHABLE_KEY",
            os.getenv("SUPABASE_ANON_KEY", ""),
        )
    )
    supabase_service_role_key: str = field(
        default_factory=lambda: os.getenv(
            "SUPABASE_SECRET_KEY",
            os.getenv("SUPABASE_SERVICE_ROLE_KEY", ""),
        )
    )
    gemini_api_key: str = field(default_factory=lambda: os.getenv("GEMINI_API_KEY", ""))
    ai_provider: str = field(default_factory=lambda: os.getenv("AI_PROVIDER", "gemini"))
    gemini_model: str = field(default_factory=lambda: os.getenv("GEMINI_MODEL", ""))
    gemini_model_version: str = field(
        default_factory=lambda: os.getenv("GEMINI_MODEL_VERSION", "")
    )
    analysis_max_attempts: int = field(
        default_factory=lambda: int(os.getenv("ANALYSIS_MAX_ATTEMPTS", "5"))
    )
    environment: str = field(default_factory=lambda: os.getenv("APP_ENV", "development"))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
