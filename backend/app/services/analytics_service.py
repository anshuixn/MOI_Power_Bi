from __future__ import annotations

from datetime import datetime
from typing import Any

from app.repositories.review_insight_repository import ReviewInsightRepository
from app.services.date_range import date_window


class AnalyticsService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def get_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        query_filters = self._date_filters(filters)
        query_filters.update({
            "product_id": filters.get("product_id"),
            "source": filters.get("source"),
            "sentiment": filters.get("sentiment"),
            "topic_id": filters.get("topic_id"),
            "complaint_id": filters.get("complaint_id"),
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
            "limit": 6,
        })
        average_rating = float(data.get("average_rating", 0))
        active_complaints = int(data.get("active_complaints", 0))
        has_comparison = isinstance(data.get("comparison"), dict)
        comparison = data.get("comparison") or {}
        comparison_analyzed = int(comparison.get("analyzed_reviews", 0))
        previous_sentiment = {
            "positive": self._percentage(
                int(comparison.get("positive_count", 0)), comparison_analyzed
            ),
            "neutral": self._percentage(
                int(comparison.get("neutral_count", 0)), comparison_analyzed
            ),
            "negative": self._percentage(
                int(comparison.get("negative_count", 0)), comparison_analyzed
            ),
        }
        comparison_label = self._comparison_label(
            query_filters["start_at"], query_filters["end_at"]
        ) if has_comparison else "comparison unavailable"

        return {
            "total_reviews": self._kpi(
                "total-reviews", "Total Reviews", total, f"{total:,}",
                previous_value=(
                    int(comparison["total_reviews"]) if has_comparison else None
                ),
                comparison_label=comparison_label,
            ),
            "average_rating": self._kpi(
                "avg-rating", "Average Rating", average_rating, f"{average_rating:.2f}", "/ 5",
                previous_value=(
                    float(comparison["average_rating"]) if has_comparison else None
                ),
                comparison_label=comparison_label,
            ),
            "positive_sentiment": self._kpi(
                "positive-sentiment", "Positive Sentiment", positive_pct, f"{positive_pct}%",
                previous_value=(
                    previous_sentiment["positive"] if has_comparison else None
                ),
                comparison_label=comparison_label,
            ),
            "neutral_sentiment": self._kpi(
                "neutral-sentiment", "Neutral Sentiment", neutral_pct, f"{neutral_pct}%",
                positive_when_up=False,
                previous_value=(
                    previous_sentiment["neutral"] if has_comparison else None
                ),
                comparison_label=comparison_label,
            ),
            "negative_sentiment": self._kpi(
                "negative-sentiment", "Negative Sentiment", negative_pct, f"{negative_pct}%",
                positive_when_up=False,
                previous_value=(
                    previous_sentiment["negative"] if has_comparison else None
                ),
                comparison_label=comparison_label,
            ),
            "active_complaints": self._kpi(
                "active-complaints", "Active Complaints", active_complaints,
                f"{active_complaints:,}",
                positive_when_up=False,
                previous_value=(
                    int(comparison["active_complaints"]) if has_comparison else None
                ),
                comparison_label=comparison_label,
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
            "review_volume": data.get("review_volume", []),
            "product_comparison": data.get("product_comparison", []),
            "source_comparison": data.get("source_comparison", []),
        }

    @staticmethod
    def _date_filters(filters: dict[str, Any]) -> dict[str, str]:
        return date_window(filters)

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
        *,
        previous_value: int | float | None = None,
        positive_when_up: bool = True,
        comparison_label: str = "comparison unavailable",
    ) -> dict[str, Any]:
        if previous_value is None:
            difference = 0.0
            percent_change = 0.0
        else:
            difference = round(float(value) - float(previous_value), 1)
            percent_change = (
                round(difference * 100 / float(previous_value), 1)
                if previous_value
                else (100.0 if value > 0 else 0.0)
            )
        direction = "up" if difference > 0 else "down" if difference < 0 else "flat"
        return {
            "id": identifier,
            "label": label,
            "value": value,
            "formatted_value": formatted_value,
            "delta": {
                "value": difference,
                "pct": percent_change,
                "direction": direction,
                "is_positive": (
                    direction == "up" if positive_when_up else direction == "down"
                ),
                "comparison_label": comparison_label,
            },
            "sparkline": [],
            **({"unit": unit} if unit else {}),
        }

    @staticmethod
    def _comparison_label(start_at: str, end_at: str) -> str:
        start = datetime.fromisoformat(start_at)
        end = datetime.fromisoformat(end_at)
        days = (end - start).days
        unit = "day" if days == 1 else "days"
        return f"vs previous {days} {unit}"
