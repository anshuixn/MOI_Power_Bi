from datetime import date
from typing import Literal

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
    product_id: str | None = Query(None, alias="productId"),
    source: str | None = None,
    service: AnalyticsService = Depends(get_analytics_service),
):
    filters = {
        "date_range": date_range,
        "custom_date_start": custom_date_start.isoformat() if custom_date_start else None,
        "custom_date_end": custom_date_end.isoformat() if custom_date_end else None,
        "product_id": product_id,
        "source": source,
    }
    return Result(status="success", data=service.get_summary(filters)).model_dump()


@router.get("/kpis")
def get_kpis():
    return Result(
        status="success",
        data={"items": ["total_reviews", "avg_rating", "positive_sentiment"]},
    ).model_dump()


@router.get("/health")
def health():
    return {"status": "ok"}
