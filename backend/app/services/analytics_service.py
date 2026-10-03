from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Any

from app.core.exceptions import InvalidRequestError
from app.repositories.review_insight_repository import ReviewInsightRepository


class AnalyticsService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def get_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        query_filters = self._date_filters(filters)
        query_filters.update({
            "product_id": filters.get("product_id"),
            "source": filters.get("source"),
        })
        data = self.repository.dashboard_data(query_filters)

        total = int(data.get("total_reviews", 0))
        analyzed = int(data.get("analyzed_reviews", 0))
        positive = int(data.get("positive_count", 0))
        neutral = int(data.get("neutral_count", 0))
        negative = int(data.get("negative_count", 0))
        positive_pct = self._percentage(positive, analyzed)
        neutral_pct = self._percentage(neutral, analyzed)
        negative_pct = self._percentage(negative, analyzed)
        topics = data.get("topics", [])
        complaints = data.get("complaints", [])
        insights = self.repository.list_insights({
            **query_filters,
        })[:6]
        average_rating = float(data.get("average_rating", 0))
        active_complaints = int(data.get("active_complaints", 0))

        return {
            "total_reviews": self._kpi(
                "total-reviews", "Total Reviews", total, f"{total:,}"
            ),
            "average_rating": self._kpi(
                "avg-rating", "Average Rating", average_rating, f"{average_rating:.2f}", "/ 5"
            ),
            "positive_sentiment": self._kpi(
                "positive-sentiment", "Positive Sentiment", positive_pct, f"{positive_pct}%"
            ),
            "neutral_sentiment": self._kpi(
                "neutral-sentiment", "Neutral Sentiment", neutral_pct, f"{neutral_pct}%"
            ),
            "negative_sentiment": self._kpi(
                "negative-sentiment", "Negative Sentiment", negative_pct, f"{negative_pct}%"
            ),
            "active_complaints": self._kpi(
                "active-complaints", "Active Complaints", active_complaints,
                f"{active_complaints:,}"
            ),
            "sentiment": {
                "positive": positive_pct,
                "neutral": neutral_pct,
                "negative": negative_pct,
                "total_reviews": total,
                "trend": data.get("sentiment_trend", []),
            },
            "topics": topics,
            "complaints": complaints,
            "recent_insights": insights,
            "spotlight_review": None,
            "model_health": None,
            "rating_distribution": {
                str(key): value
                for key, value in data.get("rating_distribution", {}).items()
            },
            "source_breakdown": data.get("source_breakdown", {}),
            "product_breakdown": data.get("product_breakdown", {}),
        }

    @staticmethod
    def _date_filters(filters: dict[str, Any]) -> dict[str, str]:
        today = datetime.now(timezone.utc).date()
        date_range = filters.get("date_range", "last_30_days")
        if date_range == "custom":
            start_value = filters.get("custom_date_start")
            end_value = filters.get("custom_date_end")
            if not start_value or not end_value:
                raise InvalidRequestError(
                    "dateStart and dateEnd are required when dateRange is custom"
                )
            start = date.fromisoformat(start_value)
            end = date.fromisoformat(end_value)
            if end < start:
                raise InvalidRequestError("dateEnd must be on or after dateStart")
        else:
            days = {"last_7_days": 7, "last_30_days": 30, "last_90_days": 90}.get(date_range)
            if days is None:
                raise InvalidRequestError("Unsupported dateRange")
            end = today
            start = end - timedelta(days=days - 1)

        return {
            "start_at": datetime.combine(start, datetime.min.time(), timezone.utc).isoformat(),
            "end_at": datetime.combine(
                end + timedelta(days=1), datetime.min.time(), timezone.utc
            ).isoformat(),
        }

    @staticmethod
    def _percentage(value: int, total: int) -> float:
        return round(value * 100 / total, 1) if total else 0.0

    @staticmethod
    def _kpi(
        identifier: str,
        label: str,
        value: int | float,
        formatted_value: str,
        unit: str | None = None,
    ) -> dict[str, Any]:
        return {
            "id": identifier,
            "label": label,
            "value": value,
            "formatted_value": formatted_value,
            "delta": {
                "value": 0,
                "pct": 0,
                "direction": "flat",
                "is_positive": False,
                "comparison_label": "comparison unavailable",
            },
            "sparkline": [],
            **({"unit": unit} if unit else {}),
        }
