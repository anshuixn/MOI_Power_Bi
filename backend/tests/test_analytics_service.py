from __future__ import annotations

from typing import Any

from app.services.analytics_service import AnalyticsService
from app.services.date_range import date_window


class DeterministicAnalyticsRepository:
    def __init__(self, result: dict[str, Any]) -> None:
        self.result = result
        self.filters: dict[str, Any] | None = None
        self.insight_options: dict[str, Any] | None = None

    def dashboard_data(self, filters: dict[str, Any]) -> dict[str, Any]:
        self.filters = filters
        return self.result

    def list_insights(self, options: dict[str, Any]) -> list[dict[str, Any]]:
        self.insight_options = options
        return []


def test_summary_uses_stored_counts_for_kpis_and_returns_database_distributions() -> None:
    repository = DeterministicAnalyticsRepository({
        "total_reviews": 5,
        "average_rating": 3.8,
        "analyzed_reviews": 5,
        "positive_count": 3,
        "neutral_count": 1,
        "negative_count": 1,
        "active_complaints": 2,
        "comparison": {
            "total_reviews": 4,
            "average_rating": 3.5,
            "analyzed_reviews": 4,
            "positive_count": 2,
            "neutral_count": 1,
            "negative_count": 1,
            "active_complaints": 3,
        },
        "sentiment_trend": [
            {
                "date": "2026-10-01",
                "positive": 60,
                "neutral": 20,
                "negative": 20,
                "review_count": 5,
            }
        ],
        "review_volume": [{"date": "2026-10-01", "review_count": 7}],
        "rating_distribution": {"1": 0, "2": 1, "3": 1, "4": 1, "5": 2},
        "source_breakdown": {"web_store": 5},
        "product_breakdown": {"Example": 5},
        "source_comparison": [
            {"source": "web_store", "review_count": 5, "average_rating": 3.8}
        ],
        "product_comparison": [
            {
                "product_id": "product-1",
                "product_name": "Example",
                "review_count": 5,
                "average_rating": 3.8,
            }
        ],
        "topics": [{"id": "topic-1", "mentions": 4}],
        "complaints": [{"id": "complaint-1", "active_count": 2}],
    })

    summary = AnalyticsService(repository).get_summary({
        "date_range": "custom",
        "custom_date_start": "2026-10-01",
        "custom_date_end": "2026-10-01",
        "product_id": "product-1",
        "source": "web_store",
        "sentiment": "positive",
        "topic_id": "topic-1",
        "complaint_id": "complaint-1",
    })

    assert summary["total_reviews"]["value"] == 5
    assert summary["average_rating"]["value"] == 3.8
    assert summary["positive_sentiment"]["value"] == 60
    assert summary["neutral_sentiment"]["value"] == 20
    assert summary["negative_sentiment"]["value"] == 20
    assert summary["active_complaints"]["value"] == 2
    assert summary["total_reviews"]["delta"] == {
        "value": 1.0,
        "pct": 25.0,
        "direction": "up",
        "is_positive": True,
        "comparison_label": "vs previous 1 day",
    }
    assert summary["positive_sentiment"]["delta"]["value"] == 10.0
    assert summary["active_complaints"]["delta"]["is_positive"] is True
    assert summary["sentiment"]["trend"][0]["review_count"] == 5
    assert summary["review_volume"][0]["review_count"] == 7
    assert summary["topics"] == [{"id": "topic-1", "mentions": 4}]
    assert summary["complaints"] == [{"id": "complaint-1", "active_count": 2}]
    assert repository.filters == {
        "start_at": "2026-10-01T00:00:00+00:00",
        "end_at": "2026-10-02T00:00:00+00:00",
        "product_id": "product-1",
        "source": "web_store",
        "sentiment": "positive",
        "topic_id": "topic-1",
        "complaint_id": "complaint-1",
    }
    assert repository.insight_options["limit"] == 6


def test_summary_handles_an_empty_dataset_without_inventing_percentages() -> None:
    repository = DeterministicAnalyticsRepository({
        "total_reviews": 0,
        "average_rating": 0,
        "analyzed_reviews": 0,
        "positive_count": 0,
        "neutral_count": 0,
        "negative_count": 0,
        "active_complaints": 0,
        "sentiment_trend": [],
        "review_volume": [],
        "rating_distribution": {},
        "source_breakdown": {},
        "product_breakdown": {},
        "product_comparison": [],
        "source_comparison": [],
        "topics": [],
        "complaints": [],
    })

    summary = AnalyticsService(repository).get_summary({
        "date_range": "last_7_days",
    })

    assert summary["total_reviews"]["value"] == 0
    assert summary["positive_sentiment"]["value"] == 0
    assert summary["neutral_sentiment"]["value"] == 0
    assert summary["negative_sentiment"]["value"] == 0
    assert summary["sentiment"]["trend"] == []
    assert summary["topics"] == []
    assert summary["complaints"] == []


def test_custom_date_window_includes_both_dates_using_exclusive_utc_end() -> None:
    assert date_window({
        "date_range": "custom",
        "custom_date_start": "2026-10-01",
        "custom_date_end": "2026-10-03",
    }) == {
        "start_at": "2026-10-01T00:00:00+00:00",
        "end_at": "2026-10-04T00:00:00+00:00",
    }
