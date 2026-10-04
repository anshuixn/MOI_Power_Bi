from __future__ import annotations

import json
from types import SimpleNamespace
from typing import Any
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.core.exceptions import InvalidRequestError
from app.integrations import ai_provider
from app.integrations.ai_provider import GeminiInsightProvider, ProviderInsight
from app.schemas.insights import GeneratedInsight
from app.services.ai_insight_service import AIInsightService
from app.services.model_health_service import ModelHealthService

ORGANIZATION_ID = UUID("11111111-1111-4111-8111-111111111111")
TOPIC_ID = "22222222-2222-4222-8222-222222222222"
REVIEW_ID = "33333333-3333-4333-8333-333333333333"


class EvidenceRepository:
    def __init__(self, analytics: dict[str, Any] | None = None) -> None:
        self.analytics = analytics or {
            "total_reviews": 60,
            "average_rating": 4.2,
            "analyzed_reviews": 60,
            "positive_count": 35,
            "neutral_count": 15,
            "negative_count": 10,
            "comparison": {
                "total_reviews": 60,
                "average_rating": 4.0,
                "analyzed_reviews": 60,
                "positive_count": 30,
                "neutral_count": 15,
                "negative_count": 15,
            },
            "rating_distribution": {"4": 30, "5": 30},
            "review_volume": [{"date": "2026-10-03", "review_count": 7}],
            "sentiment_trend": [],
            "topics": [{
                "id": TOPIC_ID,
                "name": "Delivery",
                "mentions": 8,
                "trend": "rising",
                "trend_pct": 33.3,
                "positive_pct": 20.0,
                "neutral_pct": 20.0,
                "negative_pct": 60.0,
                "sample_review_ids": [REVIEW_ID],
            }],
            "complaints": [],
            "product_comparison": [],
        }
        self.created: list[dict[str, Any]] = []

    def dashboard_data(self, _filters: dict[str, Any]) -> dict[str, Any]:
        return self.analytics

    def create_insight(self, row: dict[str, Any]) -> dict[str, Any]:
        self.created.append(row)
        return {
            "id": "insight-id",
            "generated_at": "2026-10-04T00:00:00+00:00",
            "is_new": True,
            **row,
        }

    def model_health_data(self, _days: int) -> dict[str, Any]:
        return {
            "reviews_processed": 40,
            "successful_analyses": 40,
            "failed_analyses": 10,
            "queue_depth": 3,
            "processing_latency_avg_ms": 120.5,
            "processing_latency_p95_ms": 250,
            "latency_sample_count": 50,
            "model_versions": [{"provider": "gemini", "model": "gemini", "version": "v1"}],
            "confidence_distribution": {"low": 4, "medium": 10, "high": 26},
            "confidence_sample_count": 40,
            "sentiment_distribution": {
                "positive": 45, "neutral": 30, "negative": 25,
            },
            "comparison_sentiment_distribution": {
                "positive": 25, "neutral": 25, "negative": 50,
            },
            "comparison_successful_analyses": 100,
            "topic_distribution": [{"name": "Delivery", "mentions": 8}],
            "complaint_distribution": [{"category": "Shipping", "mentions": 5}],
        }


class EvidenceProvider:
    provider_name = "gemini"
    model_name = "gemini-test"

    def __init__(self, evidence_key: str = f"topic_movement:{TOPIC_ID}") -> None:
        self.evidence_key = evidence_key
        self.received: dict[str, object] | None = None

    def interpret(self, evidence: dict[str, object]) -> ProviderInsight:
        self.received = evidence
        return ProviderInsight(
            insight=GeneratedInsight(
                kind="topic_movement",
                evidence_key=self.evidence_key,
                title="Delivery feedback is shifting",
                summary="Customers increasingly describe delivery concerns.",
                confidence=0.87,
                impact="medium",
            ),
            model_version="gemini-test-version",
        )


def test_insight_evidence_uses_database_metrics_and_is_persisted() -> None:
    repository = EvidenceRepository()
    provider = EvidenceProvider()
    result = AIInsightService(repository, provider).generate(
        ORGANIZATION_ID,
        {"date_range": "custom", "custom_date_start": "2026-10-01",
         "custom_date_end": "2026-10-03"},
    )

    assert provider.received is not None
    assert provider.received["metrics"]["total_reviews"] == 60
    assert provider.received["metrics"]["average_rating"] == 4.2
    assert repository.created[0]["supporting_metrics"]["analytics"]["negative_count"] == 10
    assert repository.created[0]["topic_id"] == TOPIC_ID
    assert repository.created[0]["related_review_ids"] == [REVIEW_ID]
    assert repository.created[0]["provider"] == "gemini"
    assert repository.created[0]["model"] == "gemini-test"
    assert repository.created[0]["model_version"] == "gemini-test-version"
    assert result["kind"] == "topic_movement"


def test_insight_rejects_provider_evidence_not_in_database_evidence() -> None:
    repository = EvidenceRepository()
    provider = EvidenceProvider("topic_movement:not-a-known-topic")
    with pytest.raises(InvalidRequestError, match="evidence"):
        AIInsightService(repository, provider).generate(
            ORGANIZATION_ID, {"date_range": "last_30_days"}
        )
    assert repository.created == []


def test_insight_requires_real_completed_analytics() -> None:
    repository = EvidenceRepository({
        "total_reviews": 2,
        "average_rating": 4.0,
        "analyzed_reviews": 0,
        "comparison": {},
        "topics": [],
        "complaints": [],
        "product_comparison": [],
    })
    with pytest.raises(InvalidRequestError, match="completed review analysis"):
        AIInsightService(repository, EvidenceProvider()).generate(
            ORGANIZATION_ID, {"date_range": "last_30_days"}
        )


def test_gemini_insight_provider_sends_json_evidence_and_tracks_version(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    generated = GeneratedInsight(
        kind="sentiment_trend",
        evidence_key="sentiment_trend",
        title="Customer sentiment is improving",
        summary="Positive feedback is more common in the current period.",
        confidence=0.91,
        impact="low",
    )

    class Interactions:
        parameters: dict[str, Any] = {}

        def create(self, **kwargs: Any) -> Any:
            self.parameters = kwargs
            return SimpleNamespace(
                output_text=generated.model_dump_json(),
                model_version="served-model-version",
            )

    interactions = Interactions()

    class FakeGemini:
        def __init__(self, *, api_key: str) -> None:
            assert api_key == "server-test-key"
            self.interactions = interactions

    monkeypatch.setattr(ai_provider.genai, "Client", FakeGemini)
    provider = GeminiInsightProvider("server-test-key", "gemini-test")
    result = provider.interpret({"metrics": {"total_reviews": 60}})

    assert result.insight == generated
    assert result.model_version == "served-model-version"
    assert interactions.parameters["response_format"]["mime_type"] == "application/json"
    assert (
        interactions.parameters["response_format"]["schema"]
        == GeneratedInsight.model_json_schema()
    )
    assert interactions.parameters["store"] is False
    sent_evidence = json.loads(
        interactions.parameters["input"].split("\n\n", 1)[1].split("\n", 1)[1]
    )
    assert sent_evidence == {"metrics": {"total_reviews": 60}}


def test_generated_insight_text_cannot_supply_numeric_metrics() -> None:
    with pytest.raises(ValidationError):
        GeneratedInsight(
            kind="rating_change",
            evidence_key="rating_change",
            title="Rating rises",
            summary="Ratings rose by 20 percent.",
            confidence=0.8,
            impact="low",
        )


def test_model_health_calculates_drift_from_historical_sentiment_counts() -> None:
    health = ModelHealthService(EvidenceRepository()).get_health(30)
    assert health["overall_status"] == "degraded"
    assert health["reviews_processed"] == 40
    assert health["successful_analyses"] == 40
    assert health["failed_analyses"] == 10
    assert health["processing_latency_avg_ms"] == 120.5
    assert health["model_versions"][0]["version"] == "v1"
    assert health["confidence_distribution"] == {"low": 4, "medium": 10, "high": 26}
    assert health["confidence_sample_count"] == 40
    assert health["topic_distribution"][0]["mentions"] == 8
    assert health["complaint_distribution"][0]["mentions"] == 5
    assert health["drift_available"] is True
    assert health["drift_score"] == 0.25
    assert health["drift_method"] == "sentiment distribution total variation"


def test_model_health_does_not_claim_drift_without_minimum_historical_samples() -> None:
    repository = EvidenceRepository()
    repository.model_health_data = lambda _days: {
        "successful_analyses": 10,
        "failed_analyses": 0,
        "sentiment_distribution": {"positive": 10},
        "comparison_successful_analyses": 100,
        "comparison_sentiment_distribution": {"negative": 100},
    }
    health = ModelHealthService(repository).get_health(30)
    assert health["drift_available"] is False
    assert health["drift_score"] is None


def test_distribution_drift_rejects_empty_baseline() -> None:
    with pytest.raises(ValueError, match="non-empty"):
        ModelHealthService.distribution_drift(
            {"positive": 1}, {"positive": 0, "negative": 0}
        )
