from __future__ import annotations

from datetime import date
from typing import Any

from app.core.exceptions import InvalidRequestError


def _get_multiplier(filters: dict[str, Any]) -> float:
    multiplier = 1.0
    date_range = filters.get("date_range", "last_30_days")
    if date_range == "last_7_days":
        multiplier *= 0.22
    elif date_range == "last_30_days":
        multiplier *= 1.0
    elif date_range == "last_90_days":
        multiplier *= 2.84
    elif date_range == "custom" and filters.get("custom_date_start") and filters.get("custom_date_end"):
        start = date.fromisoformat(filters["custom_date_start"])
        end = date.fromisoformat(filters["custom_date_end"])
        if end < start:
            raise InvalidRequestError("dateEnd must be on or after dateStart")
        multiplier *= ((end - start).days + 1) / 30
    elif date_range == "custom":
        raise InvalidRequestError(
            "dateStart and dateEnd are required when dateRange is custom"
        )
    if filters.get("product_id"):
        multiplier *= 0.31
    if filters.get("source"):
        multiplier *= 0.42
    return multiplier


def _scale_counts(counts: dict[Any, int], target_total: int) -> dict[str, int]:
    total = sum(counts.values())
    entries = [
        (str(key), round((value / total) * target_total))
        for key, value in counts.items()
    ]
    current_total = sum(value for _, value in entries)
    largest_key, largest_value = max(entries, key=lambda item: item[1])
    entries = [(key, value) for key, value in entries if key != largest_key]
    entries.append((largest_key, largest_value + (target_total - current_total)))
    return {key: value for key, value in entries}


def _make_delta(pct: float, is_positive_good: bool) -> dict[str, Any]:
    direction = "up" if pct > 0 else "down" if pct < 0 else "flat"
    return {
        "value": 0,
        "pct": pct,
        "direction": direction,
        "is_positive": is_positive_good and pct > 0 or (not is_positive_good and pct < 0),
        "comparison_label": "vs previous 30 days",
    }


def build_dashboard_summary(
    filters: dict[str, Any], data: dict[str, Any]
) -> dict[str, Any]:
    multiplier = _get_multiplier(filters)
    total_reviews = max(1, round(data["baseline_total_reviews"] * multiplier))
    positive_pct = data["baseline_sentiment"]["positive"]
    neutral_pct = data["baseline_sentiment"]["neutral"]
    negative_pct = round(100 - positive_pct - neutral_pct, 1)
    complaints = [
        {**complaint, "active_count": max(1, round(complaint["active_count"] * min(multiplier, 1.0)))}
        for complaint in data["complaints"]
    ]
    active_complaints = sum(item["active_count"] for item in complaints)

    summary = {
        "total_reviews": {
            "id": "total-reviews",
            "label": "Total Reviews",
            "value": total_reviews,
            "formatted_value": f"{total_reviews:,}",
            "delta": _make_delta(8.2, True),
            "sparkline": data["sparklines"]["total_reviews"],
        },
        "average_rating": {
            "id": "avg-rating",
            "label": "Average Rating",
            "value": data["baseline_average_rating"],
            "formatted_value": f"{data['baseline_average_rating']:.2f}",
            "delta": _make_delta(6.8, True),
            "sparkline": data["sparklines"]["avg_rating"],
            "unit": "/ 5",
        },
        "positive_sentiment": {
            "id": "positive-sentiment",
            "label": "Positive Sentiment",
            "value": positive_pct,
            "formatted_value": f"{positive_pct}%",
            "delta": _make_delta(8.1, True),
            "sparkline": data["sparklines"]["positive_sentiment"],
        },
        "neutral_sentiment": {
            "id": "neutral-sentiment",
            "label": "Neutral Sentiment",
            "value": neutral_pct,
            "formatted_value": f"{neutral_pct}%",
            "delta": _make_delta(2.3, False),
            "sparkline": data["sparklines"]["neutral_sentiment"],
        },
        "negative_sentiment": {
            "id": "negative-sentiment",
            "label": "Negative Sentiment",
            "value": negative_pct,
            "formatted_value": f"{negative_pct}%",
            "delta": _make_delta(-5.8, False),
            "sparkline": data["sparklines"]["negative_sentiment"],
        },
        "active_complaints": {
            "id": "active-complaints",
            "label": "Active Complaints",
            "value": active_complaints,
            "formatted_value": f"{active_complaints:,}",
            "delta": _make_delta(18.4, False),
            "sparkline": data["sparklines"]["active_complaints"],
        },
        "sentiment": {
            "positive": positive_pct,
            "neutral": neutral_pct,
            "negative": negative_pct,
            "total_reviews": total_reviews,
            "trend": data["sentiment_trend"],
        },
        "topics": [
            {**topic, "mentions": max(1, round(topic["mentions"] * multiplier))}
            for topic in data["topics"]
        ],
        "complaints": complaints,
        "recent_insights": data["insights"][:6],
        "spotlight_review": data["spotlight_review"],
        "model_health": data["model_health"],
        "rating_distribution": _scale_counts(data["rating_distribution"], total_reviews),
        "source_breakdown": _scale_counts(data["source_breakdown"], total_reviews),
        "product_breakdown": _scale_counts(data["product_breakdown"], total_reviews),
    }
    return summary
