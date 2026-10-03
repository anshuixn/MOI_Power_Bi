import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    app_name: str = "ReviewBand API"
    frontend_url: str = os.getenv("FRONTEND_URL", "http://localhost:5173")
    supabase_url: str = os.getenv("SUPABASE_URL", "")
    supabase_anon_key: str = os.getenv("SUPABASE_ANON_KEY", "")
    supabase_service_role_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    openai_api_key: str = os.getenv("OPENAI_API_KEY", "")
    environment: str = os.getenv("APP_ENV", "development")


settings = Settings()
