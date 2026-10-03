from typing import Literal

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.api.dependencies import get_review_processing_service, get_review_service
from app.schemas.common import PaginatedResult, Result
from app.schemas.ingestion import (
    CreateReviewRequest,
    CsvImportSummary,
    ImportBatchStatus,
    ReviewAnalysisRetryResult,
    ReviewIngestionResult,
)
from app.schemas.review import Review
from app.services.review_processing_service import ReviewProcessingService
from app.services.review_service import ReviewService

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.post("", response_model=Result[ReviewIngestionResult])
@router.post("/", response_model=Result[ReviewIngestionResult], include_in_schema=False)
def create_review(
    request: CreateReviewRequest,
    service: ReviewProcessingService = Depends(get_review_processing_service),
):
    return Result(
        status="success", data=service.create_review(request)
    ).model_dump()


@router.post("/import", response_model=Result[CsvImportSummary])
async def import_reviews(
    file: UploadFile = File(..., description="UTF-8 CSV file of reviews"),
    service: ReviewProcessingService = Depends(get_review_processing_service),
):
    content = await file.read(5 * 1024 * 1024 + 1)
    summary = service.import_csv(file.filename or "reviews.csv", content)
    return Result(status="success", data=summary).model_dump()


@router.get("/imports/{batch_id}", response_model=Result[ImportBatchStatus])
def get_import_status(
    batch_id: str,
    service: ReviewProcessingService = Depends(get_review_processing_service),
):
    return Result(
        status="success", data=service.get_import_status(batch_id)
    ).model_dump()


@router.post(
    "/{review_id}/analysis/retry",
    response_model=Result[ReviewAnalysisRetryResult],
)
def retry_review_analysis(
    review_id: str,
    service: ReviewProcessingService = Depends(get_review_processing_service),
):
    return Result(
        status="success", data=service.retry_analysis(review_id)
    ).model_dump()


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
