from __future__ import annotations

from app.data.mock_data import COMPLAINTS, INSIGHTS, REVIEWS, TOPICS


class ReviewInsightRepository:
    """Thin repository adapter around the provided mock dataset."""

    def list_reviews(self):
        return list(REVIEWS)

    def get_review(self, review_id: str):
        return next((item for item in REVIEWS if item["id"] == review_id), None)

    def list_topics(self):
        return list(TOPICS)

    def list_complaints(self):
        return list(COMPLAINTS)

    def list_insights(self):
        return list(INSIGHTS)
