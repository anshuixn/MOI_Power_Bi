import sys
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[1]
if str(BACKEND_ROOT) not in sys.path:
    sys.path.insert(0, str(BACKEND_ROOT))

import pytest
from fastapi.testclient import TestClient

from app.api.dependencies import get_repository
from app.main import app
from tests.fixtures import mock_data


class ApiContractRepository:
    """Isolated deterministic fixture for endpoint response-contract tests."""

    def list_reviews(self, options: dict[str, Any]) -> dict[str, Any]:
        reviews = list(mock_data.REVIEWS)
        for key in ("product_id", "source"):
            if options.get(key):
                reviews = [row for row in reviews if row[key] == options[key]]
        if options.get("search"):
            term = options["search"].casefold()
            reviews = [
                row for row in reviews
                if term in row["text"].casefold()
                or term in row["product_name"].casefold()
            ]
        if options.get("sentiment"):
            reviews = [
                row for row in reviews
                if row["sentiment"]["label"] == options["sentiment"]
            ]
        if options.get("rating") is not None:
            reviews = [row for row in reviews if row["rating"] == options["rating"]]
        if options.get("topic_id"):
            reviews = [
                row for row in reviews if options["topic_id"] in row["topic_ids"]
            ]

        sort_by = options.get("sort_by", "date")
        reviews.sort(
            key=lambda row: (
                row["sentiment"]["confidence"] if sort_by == "confidence"
                else row[sort_by]
            ),
            reverse=options.get("sort_order", "desc") == "desc",
        )
        page = options.get("page", 1)
        page_size = options.get("page_size", 10)
        total = len(reviews)
        page_count = max(1, (total + page_size - 1) // page_size)
        page = min(page, page_count)
        return {
            "items": reviews[(page - 1) * page_size:page * page_size],
            "total": total,
            "page": page,
            "page_size": page_size,
            "page_count": page_count,
        }

    def get_review(self, review_id: str) -> dict[str, Any] | None:
        return next((row for row in mock_data.REVIEWS if row["id"] == review_id), None)

    def list_topics(self) -> list[dict[str, Any]]:
        return list(mock_data.TOPICS)

    def get_topic(self, topic_id: str) -> dict[str, Any] | None:
        return next((row for row in mock_data.TOPICS if row["id"] == topic_id), None)

    def get_topic_reviews(self, topic_id: str) -> list[dict[str, Any]]:
        return [
            row for row in mock_data.REVIEWS if topic_id in row["topic_ids"]
        ]

    def list_complaints(self) -> list[dict[str, Any]]:
        return list(mock_data.COMPLAINTS)

    def get_complaint(self, complaint_id: str) -> dict[str, Any] | None:
        return next(
            (row for row in mock_data.COMPLAINTS if row["id"] == complaint_id),
            None,
        )

    def list_insights(self, options: dict[str, Any]) -> list[dict[str, Any]]:
        items = list(mock_data.INSIGHTS)
        for key in ("kind", "impact", "topic_id", "product_id"):
            if options.get(key):
                items = [row for row in items if row.get(key) == options[key]]
        if options.get("min_confidence") is not None:
            items = [
                row for row in items
                if row["confidence"] >= options["min_confidence"]
            ]
        if options.get("start_at"):
            items = [
                row for row in items if row["generated_at"] >= options["start_at"]
            ]
        if options.get("end_at"):
            items = [
                row for row in items if row["generated_at"] < options["end_at"]
            ]
        return items

    def get_insight(self, insight_id: str) -> dict[str, Any] | None:
        return next((row for row in mock_data.INSIGHTS if row["id"] == insight_id), None)

    def list_products(self) -> list[dict[str, Any]]:
        return list(mock_data.PRODUCTS)

    def dashboard_data(self, filters: dict[str, Any]) -> dict[str, Any]:
        del filters
        total = mock_data.BASELINE_TOTAL_REVIEWS
        analyzed = total
        return {
            "total_reviews": total,
            "average_rating": mock_data.BASELINE_AVERAGE_RATING,
            "analyzed_reviews": analyzed,
            "positive_count": round(analyzed * mock_data.BASELINE_SENTIMENT["positive"] / 100),
            "neutral_count": round(analyzed * mock_data.BASELINE_SENTIMENT["neutral"] / 100),
            "negative_count": round(analyzed * mock_data.BASELINE_SENTIMENT["negative"] / 100),
            "rating_distribution": mock_data.RATING_DISTRIBUTION,
            "source_breakdown": mock_data.SOURCE_BREAKDOWN,
            "product_breakdown": mock_data.PRODUCT_BREAKDOWN,
            "sentiment_trend": [
                {**row, "review_count": row["review_count"]}
                for row in mock_data.SENTIMENT_TREND
            ],
            "topics": mock_data.TOPICS,
            "complaints": mock_data.COMPLAINTS,
            "active_complaints": mock_data.BASELINE_ACTIVE_COMPLAINTS,
        }


@pytest.fixture
def client():
    app.dependency_overrides[get_repository] = ApiContractRepository
    try:
        with TestClient(app) as test_client:
            yield test_client
    finally:
        app.dependency_overrides.clear()
