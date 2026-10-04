from __future__ import annotations

from typing import Any
from uuid import UUID

from app.core.exceptions import InvalidRequestError
from app.integrations.ai_provider import AIInsightProvider
from app.repositories.review_insight_repository import ReviewInsightRepository
from app.services.date_range import date_window

class AIInsightService:
    """Builds database-backed evidence and persists one provider interpretation."""

    def __init__(
        self,
        repository: ReviewInsightRepository,
        provider: AIInsightProvider,
    ) -> None:
        self.repository = repository
        self.provider = provider

    def generate(
        self,
        organization_id: UUID,
        filters: dict[str, Any],
    ) -> dict[str, Any]:
        query_filters = {
            **date_window(filters),
            "product_id": filters.get("product_id"),
            "source": filters.get("source"),
            "sentiment": filters.get("sentiment"),
            "topic_id": filters.get("topic_id"),
            "complaint_id": filters.get("complaint_id"),
        }
        analytics = self.repository.dashboard_data(query_filters)
        evidence, candidates = self._build_evidence(analytics)
        if not candidates:
            raise InvalidRequestError(
                "There is not enough completed review analysis to generate an insight"
            )

        result = self.provider.interpret(evidence)
        insight = result.insight
        candidate = next(
            (
                item for item in candidates
                if item["evidence_key"] == insight.evidence_key
            ),
            None,
        )
        if candidate is None or candidate["kind"] != insight.kind:
            raise InvalidRequestError(
                "AI provider selected evidence that was not supplied"
            )

        supporting_metrics = {
            "date_range": query_filters,
            "analytics": evidence["metrics"],
            "selected_evidence": candidate["evidence"],
        }
        return self.repository.create_insight({
            "organization_id": str(organization_id),
            "kind": insight.kind,
            "title": insight.title,
            "summary": insight.summary,
            "confidence": insight.confidence,
            "impact": insight.impact,
            "topic_id": candidate.get("topic_id"),
            "product_id": candidate.get("product_id"),
            "complaint_id": candidate.get("complaint_id"),
            "related_review_ids": candidate["related_review_ids"],
            "supporting_metrics": supporting_metrics,
            "provider": self.provider.provider_name,
            "model": self.provider.model_name,
            "model_version": result.model_version,
        })

    @staticmethod
    def _build_evidence(
        analytics: dict[str, Any],
    ) -> tuple[dict[str, Any], list[dict[str, Any]]]:
        total_reviews = int(analytics.get("total_reviews", 0))
        analyzed_reviews = int(analytics.get("analyzed_reviews", 0))
        comparison = analytics.get("comparison") or {}
        metrics = {
            "total_reviews": total_reviews,
            "analyzed_reviews": analyzed_reviews,
            "average_rating": analytics.get("average_rating"),
            "positive_count": int(analytics.get("positive_count", 0)),
            "neutral_count": int(analytics.get("neutral_count", 0)),
            "negative_count": int(analytics.get("negative_count", 0)),
            "comparison": {
                key: comparison.get(key)
                for key in (
                    "total_reviews",
                    "average_rating",
                    "analyzed_reviews",
                    "positive_count",
                    "neutral_count",
                    "negative_count",
                )
            },
            "rating_distribution": analytics.get("rating_distribution", {}),
            "review_volume": analytics.get("review_volume", []),
        }
        candidates: list[dict[str, Any]] = []

        def add_candidate(
            kind: str,
            evidence_key: str,
            candidate_evidence: dict[str, Any],
            *,
            topic_id: str | None = None,
            product_id: str | None = None,
            complaint_id: str | None = None,
            related_review_ids: list[str] | None = None,
        ) -> None:
            candidates.append({
                "kind": kind,
                "evidence_key": evidence_key,
                "evidence": candidate_evidence,
                "topic_id": topic_id,
                "product_id": product_id,
                "complaint_id": complaint_id,
                "related_review_ids": related_review_ids or [],
            })

        if analyzed_reviews:
            add_candidate(
                "sentiment_trend",
                "sentiment_trend",
                {
                    "current": {
                        "positive": metrics["positive_count"],
                        "neutral": metrics["neutral_count"],
                        "negative": metrics["negative_count"],
                    },
                    "previous": {
                        "positive": metrics["comparison"]["positive_count"],
                        "neutral": metrics["comparison"]["neutral_count"],
                        "negative": metrics["comparison"]["negative_count"],
                    },
                    "daily_trend": analytics.get("sentiment_trend", []),
                },
            )

        previous_reviews = int(comparison.get("total_reviews") or 0)
        previous_rating = comparison.get("average_rating")
        current_rating = analytics.get("average_rating")
        if (
            total_reviews
            and previous_reviews
            and previous_rating is not None
            and current_rating is not None
            and float(previous_rating) != float(current_rating)
        ):
            add_candidate(
                "rating_change",
                "rating_change",
                {
                    "current_average_rating": current_rating,
                    "previous_average_rating": previous_rating,
                    "current_review_count": total_reviews,
                    "previous_review_count": previous_reviews,
                },
            )

        for topic in analytics.get("topics", [])[:10]:
            if topic.get("mentions", 0) and topic.get("trend") != "stable":
                topic_id = str(topic["id"])
                add_candidate(
                    "topic_movement",
                    f"topic_movement:{topic_id}",
                    {
                        "topic_id": topic_id,
                        "topic_name": topic.get("name"),
                        "mentions": topic.get("mentions"),
                        "trend": topic.get("trend"),
                        "trend_pct": topic.get("trend_pct"),
                        "sentiment": {
                            "positive_pct": topic.get("positive_pct"),
                            "neutral_pct": topic.get("neutral_pct"),
                            "negative_pct": topic.get("negative_pct"),
                        },
                    },
                    topic_id=topic_id,
                    related_review_ids=topic.get("sample_review_ids", []),
                )

        for complaint in analytics.get("complaints", [])[:10]:
            if complaint.get("mentions", 0) and complaint.get("trend") == "rising":
                complaint_id = str(complaint["id"])
                add_candidate(
                    "emerging_complaint",
                    f"emerging_complaint:{complaint_id}",
                    {
                        "complaint_id": complaint_id,
                        "category": complaint.get("category"),
                        "mentions": complaint.get("mentions"),
                        "active_count": complaint.get("active_count"),
                        "severity": complaint.get("severity"),
                        "trend": complaint.get("trend"),
                        "trend_pct": complaint.get("trend_pct"),
                        "affected_products": complaint.get("affected_products", []),
                        "affected_topics": complaint.get("affected_topics", []),
                    },
                    complaint_id=complaint_id,
                    related_review_ids=complaint.get("example_review_ids", []),
                )

        average_rating = float(current_rating or 0)
        for product in analytics.get("product_comparison", [])[:10]:
            product_rating = product.get("average_rating")
            if (
                product.get("review_count", 0)
                and product_rating is not None
                and float(product_rating) < average_rating
            ):
                product_id = str(product["product_id"])
                add_candidate(
                    "product_issue",
                    f"product_issue:{product_id}",
                    {
                        "product_id": product_id,
                        "product_name": product.get("product_name"),
                        "review_count": product.get("review_count"),
                        "average_rating": product_rating,
                        "overall_average_rating": current_rating,
                    },
                    product_id=product_id,
                )

        current_counts = {
            "positive": metrics["positive_count"],
            "neutral": metrics["neutral_count"],
            "negative": metrics["negative_count"],
        }
        previous_counts = {
            "positive": int(comparison.get("positive_count") or 0),
            "neutral": int(comparison.get("neutral_count") or 0),
            "negative": int(comparison.get("negative_count") or 0),
        }
        if analyzed_reviews >= 30 and int(comparison.get("analyzed_reviews") or 0) >= 30:
            drift = 0.5 * sum(
                abs(
                    current_counts[label] / analyzed_reviews
                    - previous_counts[label] / int(comparison["analyzed_reviews"])
                )
                for label in current_counts
            )
            if drift > 0:
                add_candidate(
                    "unusual_trend",
                    "unusual_trend:sentiment_distribution",
                    {
                        "method": "sentiment distribution total variation",
                        "distance": round(drift, 6),
                        "current_sample_count": analyzed_reviews,
                        "previous_sample_count": int(comparison["analyzed_reviews"]),
                    },
                )

        evidence = {
            "metrics": metrics,
            "candidates": [
                {
                    "kind": candidate["kind"],
                    "evidence_key": candidate["evidence_key"],
                    "evidence": candidate["evidence"],
                }
                for candidate in candidates
            ],
        }
        return evidence, candidates
