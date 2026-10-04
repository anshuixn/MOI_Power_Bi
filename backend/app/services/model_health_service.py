from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from app.repositories.review_insight_repository import ReviewInsightRepository

_SENTIMENTS = ("positive", "neutral", "negative")
_MIN_DRIFT_SAMPLES = 30


class ModelHealthService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def get_health(self, days: int = 30) -> dict[str, Any]:
        data = self.repository.model_health_data(days)
        current = {
            label: int(data.get("sentiment_distribution", {}).get(label, 0))
            for label in _SENTIMENTS
        }
        previous = {
            label: int(
                data.get("comparison_sentiment_distribution", {}).get(label, 0)
            )
            for label in _SENTIMENTS
        }
        current_samples = int(data.get("successful_analyses", 0))
        previous_samples = int(data.get("comparison_successful_analyses", 0))
        drift_available = (
            current_samples >= _MIN_DRIFT_SAMPLES
            and previous_samples >= _MIN_DRIFT_SAMPLES
        )
        drift = (
            self.distribution_drift(current, previous)
            if drift_available
            else None
        )
        successful = int(data.get("successful_analyses", 0))
        failed = int(data.get("failed_analyses", 0))
        attempts = successful + failed
        if attempts == 0:
            status = "unknown"
        elif successful == 0:
            status = "offline"
        elif failed / attempts >= 0.2:
            status = "degraded"
        else:
            status = "online"

        return {
            "overall_status": status,
            "window_days": days,
            "reviews_processed": int(data.get("reviews_processed", 0)),
            "successful_analyses": successful,
            "failed_analyses": failed,
            "queue_depth": int(data.get("queue_depth", 0)),
            "processing_latency_avg_ms": data.get("processing_latency_avg_ms"),
            "processing_latency_p95_ms": data.get("processing_latency_p95_ms"),
            "latency_sample_count": int(data.get("latency_sample_count", 0)),
            "model_versions": data.get("model_versions", []),
            "confidence_distribution": data.get(
                "confidence_distribution",
                {"low": 0, "medium": 0, "high": 0},
            ),
            "confidence_sample_count": int(
                data.get("confidence_sample_count", 0)
            ),
            "sentiment_distribution": current,
            "topic_distribution": data.get("topic_distribution", []),
            "complaint_distribution": data.get("complaint_distribution", []),
            "drift_available": drift_available,
            "drift_method": "sentiment distribution total variation",
            "drift_score": drift,
            "drift_sample_count": min(current_samples, previous_samples),
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }

    @staticmethod
    def distribution_drift(
        current: dict[str, int],
        previous: dict[str, int],
    ) -> float:
        current_total = sum(current.values())
        previous_total = sum(previous.values())
        if not current_total or not previous_total:
            raise ValueError("Distribution drift requires non-empty samples")
        labels = set(current) | set(previous)
        return round(
            0.5 * sum(
                abs(
                    current.get(label, 0) / current_total
                    - previous.get(label, 0) / previous_total
                )
                for label in labels
            ),
            6,
        )
