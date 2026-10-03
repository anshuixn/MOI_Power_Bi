from fastapi import APIRouter, HTTPException, Query

from app.data.mock_data import COMPLAINTS, REVIEWS, TOPICS
from app.schemas.common import FilterState, Result
from app.services.review_analytics import build_dashboard_summary

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.get("/summary")
def get_analytics_summary(
    date_range: str = Query("last_30_days", alias="dateRange"),
    product_id: str | None = Query(None, alias="productId"),
    source: str | None = None,
):
    filters = {
        "date_range": date_range,
        "product_id": product_id,
        "source": source,
    }
    try:
        return Result(status="success", data=build_dashboard_summary(filters)).model_dump()
    except Exception as exc:  # pragma: no cover
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@router.get("/kpis")
def get_kpis():
    return {"status": "success", "data": {"items": ["total_reviews", "avg_rating", "positive_sentiment"]}}


@router.get("/health")
def health():
    return {"status": "ok"}
