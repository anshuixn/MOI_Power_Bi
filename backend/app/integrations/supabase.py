from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from supabase import Client, create_client
from supabase.client import ClientOptions

from app.core.config import Settings


@dataclass(frozen=True)
class OrganizationContext:
    user_id: UUID
    organization_id: UUID
    membership_role: str
    client: Client


def _create_client(settings: Settings, api_key: str) -> Client:
    return create_client(
        settings.supabase_url,
        api_key,
        options=ClientOptions(headers={"Authorization": ""}),
    )


def create_user_client(settings: Settings, access_token: str) -> Client:
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise RuntimeError(
            "Supabase URL and publishable key are required for database access"
        )
    client = _create_client(settings, settings.supabase_anon_key)
    client.postgrest.auth(access_token)
    return client


def create_worker_client(settings: Settings) -> Client:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise RuntimeError(
            "Supabase URL and server-side secret key are required for the analysis worker"
        )
    return _create_client(settings, settings.supabase_service_role_key)
