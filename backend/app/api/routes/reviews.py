from typing import Literal

from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_review_service
from app.schemas.common import PaginatedResult, Result
from app.schemas.review import Review
from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/", response_model=Result[PaginatedResult[Review]])
def list_reviews(
    search: str | None = None,
    sentiment: Literal["positive", "neutral", "negative"] | None = None,
    rating: int | None = Query(None, ge=1, le=5),
    topic_id: str | None = None,
    product_id: str | None = Query(None, alias="productId"),
    source: Literal["web_store", "mobile_app", "marketplace", "survey", "social"] | None = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    sort_by: Literal["date", "rating", "confidence"] = "date",
    sort_order: Literal["asc", "desc"] = "desc",
    service: ReviewService = Depends(get_review_service),
):
    options = {
        "search": search,
        "sentiment": sentiment,
        "rating": rating,
        "topic_id": topic_id,
        "product_id": product_id,
        "source": source,
        "page": page,
        "page_size": page_size,
        "sort_by": sort_by,
        "sort_order": sort_order,
    }
    return Result(status="success", data=service.list_reviews(options)).model_dump()


@router.get("/{review_id}", response_model=Result[Review])
def get_review_by_id(
    review_id: str,
    service: ReviewService = Depends(get_review_service),
):
    return Result(status="success", data=service.get_review(review_id)).model_dump()
