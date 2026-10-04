from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query

from app.api.dependencies import (
    get_ai_insight_service,
    get_catalog_service,
    get_organization_context,
)
from app.core.exceptions import InvalidRequestError
from app.integrations.ai_provider import AIProviderError
from app.schemas.common import Result
from app.schemas.insights import Insight
from app.services.ai_insight_service import AIInsightService
from app.services.catalog_service import CatalogService
from app.integrations.supabase import OrganizationContext

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/", response_model=Result[list[Insight]])
def list_insights(
    kind: Literal[
        "trend_detected", "opportunity", "alert", "anomaly", "summary",
        "sentiment_trend", "emerging_complaint", "product_issue",
        "topic_movement", "rating_change", "unusual_trend",
    ] | None = None,
    impact: Literal["low", "medium", "high", "critical"] | None = None,
    topic_id: UUID | None = Query(None, alias="topicId"),
    product_id: UUID | None = Query(None, alias="productId"),
    min_confidence: float | None = Query(None, ge=0, le=1),
    service: CatalogService = Depends(get_catalog_service),
):
    options = {
        "kind": kind,
        "impact": impact,
        "topic_id": topic_id,
        "product_id": product_id,
        "min_confidence": min_confidence,
    }
    if topic_id is not None:
        options["topic_id"] = str(topic_id)
    if product_id is not None:
        options["product_id"] = str(product_id)
    return Result(status="success", data=service.list_insights(options)).model_dump()


@router.post("/generate", response_model=Result[Insight], status_code=201)
def generate_insight(
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    topic_id: UUID | None = Query(None, alias="topicId"),
    complaint_id: UUID | None = Query(None, alias="complaintId"),
    context: OrganizationContext = Depends(get_organization_context),
    service: AIInsightService = Depends(get_ai_insight_service),
):
    try:
        insight = service.generate(
            context.organization_id,
            {
                "date_range": date_range,
                "custom_date_start": (
                    custom_date_start.isoformat() if custom_date_start else None
                ),
                "custom_date_end": (
                    custom_date_end.isoformat() if custom_date_end else None
                ),
                "product_id": str(product_id) if product_id else None,
                "source": source,
                "sentiment": sentiment,
                "topic_id": str(topic_id) if topic_id else None,
                "complaint_id": str(complaint_id) if complaint_id else None,
            },
        )
    except AIProviderError as exc:
        raise HTTPException(
            status_code=502,
            detail="AI insight generation is temporarily unavailable",
        ) from exc
    except InvalidRequestError:
        raise
    return Result(status="success", data=insight).model_dump()


@router.get("/{insight_id}", response_model=Result[Insight])
def get_insight(
    insight_id: str,
    service: CatalogService = Depends(get_catalog_service),
):
    return Result(status="success", data=service.get_insight(insight_id)).model_dump()
