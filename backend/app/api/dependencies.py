from uuid import UUID

from fastapi import Depends, Header, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from httpx import HTTPError
from postgrest.exceptions import APIError
from supabase_auth.errors import AuthApiError

from app.core.config import settings
from app.integrations.ai_provider import create_insight_provider
from app.integrations.ai_provider import AIProviderError
from app.integrations.supabase import (
    OrganizationContext,
    create_user_client,
    create_worker_client,
)
from app.repositories.review_insight_repository import ReviewInsightRepository
from app.repositories.supabase_review_insight_repository import SupabaseReviewInsightRepository
from app.services.ai_insight_service import AIInsightService
from app.services.analytics_service import AnalyticsService
from app.services.catalog_service import CatalogService
from app.services.model_health_service import ModelHealthService
from app.services.review_processing_service import ReviewProcessingService
from app.services.review_service import ReviewService

bearer_scheme = HTTPBearer(auto_error=False)


def get_organization_context(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    organization_id: UUID = Header(alias="X-Organization-ID"),
) -> OrganizationContext:
    if credentials is None:
        raise HTTPException(status_code=401, detail="Bearer authentication is required")

    try:
        client = create_user_client(settings, credentials.credentials)
        user = client.auth.get_user(credentials.credentials).user
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Database authentication is not configured") from exc
    except AuthApiError as exc:
        raise HTTPException(status_code=401, detail="Bearer token is invalid or expired") from exc
    except HTTPError as exc:
        raise HTTPException(status_code=503, detail="Authentication service is unavailable") from exc

    if user is None:
        raise HTTPException(status_code=401, detail="Bearer token is invalid or expired")

    try:
        membership = (
            client.table("memberships")
            .select("organization_id")
            .eq("organization_id", str(organization_id))
            .eq("user_id", str(user.id))
            .maybe_single()
            .execute()
        )
    except (APIError, HTTPError) as exc:
        raise HTTPException(status_code=503, detail="Organization access could not be verified") from exc

    if membership.data is None:
        raise HTTPException(status_code=403, detail="User is not a member of this organization")

    return OrganizationContext(
        user_id=UUID(str(user.id)),
        organization_id=organization_id,
        client=client,
    )


def get_repository(
    context: OrganizationContext = Depends(get_organization_context),
) -> ReviewInsightRepository:
    return SupabaseReviewInsightRepository(context.client, context.organization_id)


def get_review_service(
    repository: ReviewInsightRepository = Depends(get_repository),
) -> ReviewService:
    return ReviewService(repository)


def get_review_processing_service(
    context: OrganizationContext = Depends(get_organization_context),
) -> ReviewProcessingService:
    repository = SupabaseReviewInsightRepository(
        context.client, context.organization_id
    )
    return ReviewProcessingService(repository, context.user_id)


def get_analytics_service(
    repository: ReviewInsightRepository = Depends(get_repository),
) -> AnalyticsService:
    return AnalyticsService(repository)


def get_catalog_service(
    repository: ReviewInsightRepository = Depends(get_repository),
) -> CatalogService:
    return CatalogService(repository)


def get_ai_insight_service(
    context: OrganizationContext = Depends(get_organization_context),
) -> AIInsightService:
    try:
        provider = create_insight_provider(settings)
    except AIProviderError as exc:
        raise HTTPException(
            status_code=503,
            detail="AI insight provider is not configured",
        ) from exc
    try:
        insight_writer = create_worker_client(settings)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=503,
            detail="AI insight storage is not configured",
        ) from exc
    repository = SupabaseReviewInsightRepository(
        context.client,
        context.organization_id,
        insight_write_client=insight_writer,
    )
    return AIInsightService(repository, provider)


def get_model_health_service(
    repository: ReviewInsightRepository = Depends(get_repository),
) -> ModelHealthService:
    return ModelHealthService(repository)
