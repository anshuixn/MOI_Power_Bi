from __future__ import annotations

from typing import Any

from app.core.exceptions import ResourceNotFoundError
from app.repositories.review_insight_repository import ReviewInsightRepository


class ReviewService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def list_reviews(self, options: dict[str, Any]) -> dict[str, Any]:
        return self.repository.list_reviews(options)

    def get_review(self, review_id: str) -> dict[str, Any]:
        review = self.repository.get_review(review_id)
        if review is None:
            raise ResourceNotFoundError("Review", review_id)
        return review
