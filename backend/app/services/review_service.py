from __future__ import annotations

from typing import Any

from app.core.exceptions import ResourceNotFoundError
from app.repositories.review_insight_repository import ReviewInsightRepository


class ReviewService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def list_reviews(self, options: dict[str, Any]) -> dict[str, Any]:
        items = self.repository.list_reviews()
        for key, fixture_key in (("product_id", "product_id"), ("source", "source")):
            value = options.get(key)
            if value:
                items = [item for item in items if item[fixture_key] == value]

        search = options.get("search")
        if search:
            query = search.casefold()
            items = [
                item for item in items
                if query in item["text"].casefold()
                or query in item["product_name"].casefold()
            ]

        sentiment = options.get("sentiment")
        if sentiment:
            items = [item for item in items if item["sentiment"]["label"] == sentiment]
        rating = options.get("rating")
        if rating is not None:
            items = [item for item in items if item["rating"] == rating]
        topic_id = options.get("topic_id")
        if topic_id:
            items = [item for item in items if topic_id in item["topic_ids"]]

        sort_by = options.get("sort_by", "date")
        items.sort(
            key=lambda item: (
                item["sentiment"]["confidence"] if sort_by == "confidence"
                else item[sort_by]
            ),
            reverse=options.get("sort_order", "desc") == "desc",
        )

        page = options.get("page", 1)
        page_size = options.get("page_size", 10)
        total = len(items)
        page_count = max(1, (total + page_size - 1) // page_size)
        page = min(page, page_count)
        start = (page - 1) * page_size
        return {
            "items": items[start:start + page_size],
            "total": total,
            "page": page,
            "page_size": page_size,
            "page_count": page_count,
        }

    def get_review(self, review_id: str) -> dict[str, Any]:
        review = self.repository.get_review(review_id)
        if review is None:
            raise ResourceNotFoundError("Review", review_id)
        return review
