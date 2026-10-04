from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from fastapi import Query

from app.api.dependencies import get_catalog_service
from app.schemas.common import PaginatedResult, Result
from app.schemas.insights import Complaint
from app.schemas.review import Review
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("/", response_model=Result[list[Complaint]])
def list_complaints(
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    topic_id: UUID | None = Query(None, alias="topicId"),
    severity: Literal["low", "medium", "high", "critical"] | None = None,
    status: Literal["open", "investigating", "resolved"] | None = None,
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, topic_id, severity, status,
    )
    return Result(
        status="success", data=service.list_complaints(filters)
    ).model_dump()


@router.get("/{complaint_id}", response_model=Result[Complaint])
def get_complaint(
    complaint_id: str,
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    topic_id: UUID | None = Query(None, alias="topicId"),
    severity: Literal["low", "medium", "high", "critical"] | None = None,
    status: Literal["open", "investigating", "resolved"] | None = None,
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, topic_id, severity, status,
    )
    return Result(
        status="success",
        data=service.get_complaint(complaint_id, filters),
    ).model_dump()


@router.get(
    "/{complaint_id}/reviews",
    response_model=Result[PaginatedResult[Review]],
)
def get_complaint_reviews(
    complaint_id: str,
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    topic_id: UUID | None = Query(None, alias="topicId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100, alias="pageSize"),
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, topic_id, None, None,
    )
    filters.update({"page": page, "page_size": page_size})
    return Result(
        status="success",
        data=service.get_complaint_reviews(complaint_id, filters),
    ).model_dump()


def _filters(
    date_range: str,
    start: date | None,
    end: date | None,
    product_id: UUID | None,
    source: str | None,
    sentiment: str | None,
    topic_id: UUID | None,
    severity: str | None,
    status: str | None,
) -> dict[str, str | None]:
    return {
        "date_range": date_range,
        "custom_date_start": start.isoformat() if start else None,
        "custom_date_end": end.isoformat() if end else None,
        "product_id": str(product_id) if product_id else None,
        "source": source,
        "sentiment": sentiment,
        "topic_id": str(topic_id) if topic_id else None,
        "severity": severity,
        "status": status,
    }
