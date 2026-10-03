from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from supabase import Client, create_client

from app.core.config import Settings


@dataclass(frozen=True)
class OrganizationContext:
    user_id: UUID
    organization_id: UUID
    client: Client


def create_user_client(settings: Settings, access_token: str) -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError("Supabase URL and anon key are required for database access")
    client = create_client(settings.supabase_url, settings.supabase_anon_key)
    client.postgrest.auth(access_token)
    return client


def create_worker_client(settings: Settings) -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase URL and server-side service role key are required for the analysis worker"
        )
    return create_client(
        settings.supabase_url,
        settings.supabase_service_role_key,
    )
