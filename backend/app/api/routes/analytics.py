from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_analytics_service
from app.schemas.common import Result
from app.schemas.insights import AnalyticsSummary
from app.services.analytics_service import AnalyticsService

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary", response_model=Result[AnalyticsSummary])
def get_analytics_summary(
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
    service: AnalyticsService = Depends(get_analytics_service),
):
    filters = {
        "date_range": date_range,
        "custom_date_start": custom_date_start.isoformat() if custom_date_start else None,
        "custom_date_end": custom_date_end.isoformat() if custom_date_end else None,
        "product_id": str(product_id) if product_id else None,
        "source": source,
        "sentiment": sentiment,
        "topic_id": str(topic_id) if topic_id else None,
        "complaint_id": str(complaint_id) if complaint_id else None,
    }
    return Result(status="success", data=service.get_summary(filters)).model_dump()


@router.get("/kpis")
def get_kpis(
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
    service: AnalyticsService = Depends(get_analytics_service),
):
    summary = service.get_summary({
        "date_range": date_range,
        "custom_date_start": custom_date_start.isoformat() if custom_date_start else None,
        "custom_date_end": custom_date_end.isoformat() if custom_date_end else None,
        "product_id": str(product_id) if product_id else None,
        "source": source,
        "sentiment": sentiment,
        "topic_id": str(topic_id) if topic_id else None,
        "complaint_id": str(complaint_id) if complaint_id else None,
    })
    return Result(
        status="success",
        data={
            "totalReviews": summary["total_reviews"],
            "averageRating": summary["average_rating"],
            "positiveSentiment": summary["positive_sentiment"],
            "neutralSentiment": summary["neutral_sentiment"],
            "negativeSentiment": summary["negative_sentiment"],
            "activeComplaints": summary["active_complaints"],
        },
    ).model_dump()


@router.get("/health")
def health():
    return {"status": "ok"}
