from fastapi import APIRouter, HTTPException, Query

from app.data.mock_data import REVIEWS
from app.schemas.common import FilterState, Result, ReviewFilterOptions

router = APIRouter(prefix="/reviews", tags=["reviews"])


@router.get("/")
def list_reviews(
    search: str | None = None,
    sentiment: str | None = None,
    rating: int | None = None,
    topic_id: str | None = None,
    product_id: str | None = Query(None, alias="productId"),
    source: str | None = None,
    page: int = 1,
    page_size: int = 10,
    sort_by: str = "date",
    sort_order: str = "desc",
):
    items = list(REVIEWS)
    if product_id:
        items = [item for item in items if item["product_id"] == product_id]
    if source:
        items = [item for item in items if item["source"] == source]
    if search:
        search_lower = search.lower()
        items = [
            item for item in items
            if search_lower in item["text"].lower() or search_lower in item["product_name"].lower()
        ]
    if sentiment:
        items = [item for item in items if item["sentiment"]["label"] == sentiment]
    if rating is not None:
        items = [item for item in items if item["rating"] == rating]
    if topic_id:
        items = [item for item in items if topic_id in item["topic_ids"]]

    sort_key = {"date": lambda item: item["date"], "rating": lambda item: item["rating"], "confidence": lambda item: item["sentiment"]["confidence"]}[sort_by]
    items.sort(key=sort_key, reverse=(sort_order == "desc"))

    total = len(items)
    page_count = max(1, (total + page_size - 1) // page_size)
    page_index = max(1, min(page, page_count))
    start = (page_index - 1) * page_size
    end = start + page_size
    paged = items[start:end]

    response = {
        "items": paged,
        "total": total,
        "page": page_index,
        "page_size": page_size,
        "page_count": page_count,
    }
    return Result(status="success", data=response).model_dump()


@router.get("/{review_id}")
def get_review_by_id(review_id: str):
    for item in REVIEWS:
        if item["id"] == review_id:
            return Result(status="success", data=item).model_dump()
    raise HTTPException(status_code=404, detail=f"Review {review_id} not found")
