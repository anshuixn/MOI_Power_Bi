from __future__ import annotations

from typing import Any

from app.data.mock_data import COMPLAINTS, INSIGHTS, REVIEWS, TOPICS

DataRecord = dict[str, Any]


class ReviewInsightRepository:
    """Read-only data access; fixture-backed until the Supabase phase."""

    def list_reviews(self) -> list[DataRecord]:
        return list(REVIEWS)

    def get_review(self, review_id: str) -> DataRecord | None:
        return next((item for item in REVIEWS if item["id"] == review_id), None)

    def list_topics(self) -> list[DataRecord]:
        return list(TOPICS)

    def list_complaints(self) -> list[DataRecord]:
        return list(COMPLAINTS)

    def list_insights(self) -> list[DataRecord]:
        return list(INSIGHTS)

    def list_products(self) -> list[DataRecord]:
        from app.data.mock_data import PRODUCTS

        return list(PRODUCTS)

    def dashboard_data(self) -> dict[str, Any]:
        from app.data.mock_data import (
            BASELINE_ACTIVE_COMPLAINTS,
            BASELINE_AVERAGE_RATING,
            BASELINE_SENTIMENT,
            BASELINE_TOTAL_REVIEWS,
            MODEL_HEALTH_DATA,
            PRODUCT_BREAKDOWN,
            RATING_DISTRIBUTION,
            SENTIMENT_TREND,
            SOURCE_BREAKDOWN,
            SPARKLINES,
            SPOTLIGHT_REVIEW,
        )

        return {
            "baseline_active_complaints": BASELINE_ACTIVE_COMPLAINTS,
            "baseline_average_rating": BASELINE_AVERAGE_RATING,
            "baseline_sentiment": BASELINE_SENTIMENT,
            "baseline_total_reviews": BASELINE_TOTAL_REVIEWS,
            "model_health": MODEL_HEALTH_DATA,
            "product_breakdown": PRODUCT_BREAKDOWN,
            "rating_distribution": RATING_DISTRIBUTION,
            "sentiment_trend": SENTIMENT_TREND,
            "source_breakdown": SOURCE_BREAKDOWN,
            "sparklines": SPARKLINES,
            "spotlight_review": SPOTLIGHT_REVIEW,
        }
