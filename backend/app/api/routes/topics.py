from datetime import date
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_catalog_service
from app.schemas.common import PaginatedResult, Result
from app.schemas.insights import Topic
from app.schemas.review import Review
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("/", response_model=Result[list[Topic]])
def list_topics(
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    complaint_id: UUID | None = Query(None, alias="complaintId"),
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, complaint_id,
    )
    return Result(status="success", data=service.list_topics(filters)).model_dump()


@router.get("/{topic_id}", response_model=Result[Topic])
def get_topic(
    topic_id: str,
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    complaint_id: UUID | None = Query(None, alias="complaintId"),
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, complaint_id,
    )
    return Result(
        status="success", data=service.get_topic(topic_id, filters)
    ).model_dump()


@router.get(
    "/{topic_id}/reviews",
    response_model=Result[PaginatedResult[Review]],
)
def get_topic_reviews(
    topic_id: str,
    date_range: Literal["last_7_days", "last_30_days", "last_90_days", "custom"] = Query(
        "last_30_days", alias="dateRange"
    ),
    custom_date_start: date | None = Query(None, alias="dateStart"),
    custom_date_end: date | None = Query(None, alias="dateEnd"),
    product_id: UUID | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    complaint_id: UUID | None = Query(None, alias="complaintId"),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100, alias="pageSize"),
    service: CatalogService = Depends(get_catalog_service),
):
    filters = _filters(
        date_range, custom_date_start, custom_date_end, product_id,
        source, sentiment, complaint_id,
    )
    filters.update({"page": page, "page_size": page_size})
    return Result(
        status="success",
        data=service.get_topic_reviews(topic_id, filters),
    ).model_dump()


def _filters(
    date_range: str,
    start: date | None,
    end: date | None,
    product_id: UUID | None,
    source: str | None,
    sentiment: str | None,
    complaint_id: UUID | None,
) -> dict[str, str | None]:
    return {
        "date_range": date_range,
        "custom_date_start": start.isoformat() if start else None,
        "custom_date_end": end.isoformat() if end else None,
        "product_id": str(product_id) if product_id else None,
        "source": source,
        "sentiment": sentiment,
        "complaint_id": str(complaint_id) if complaint_id else None,
    }
