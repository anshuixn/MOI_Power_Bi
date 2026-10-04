from __future__ import annotations

from collections import deque
from types import SimpleNamespace
from typing import Any
from uuid import UUID

import pytest
from pydantic import ValidationError

from app.core.config import Settings
from app.integrations import ai_provider
from app.integrations.ai_provider import (
    AIProviderError,
    GeminiReviewAnalysisProvider,
    ProviderAnalysis,
)
from app.schemas.analysis import ReviewAnalysisOutput
from app.services.pii_protection_service import PIIProtectionService
from app.services.review_analysis_service import ReviewAnalysisService

ORGANIZATION_ID = UUID("11111111-1111-4111-8111-111111111111")
REVIEW_ID = UUID("22222222-2222-4222-8222-222222222222")
JOB_ID = UUID("33333333-3333-4333-8333-333333333333")

GOOD_ANALYSIS = {
    "sentiment": "negative",
    "sentiment_score": -0.75,
    "sentiment_confidence": 0.93,
    "topics": [
        {"name": "Delivery Delay", "confidence": 0.91},
        {"name": "Packaging", "confidence": 0.82},
    ],
    "complaints": [
        {
            "category": "Late Delivery",
            "severity": "high",
            "confidence": 0.88,
        }
    ],
}


class FakeAnalysisRepository:
    def __init__(self, max_attempts: int = 5) -> None:
        self.max_attempts = max_attempts
        self.jobs: deque[dict[str, Any]] = deque([{
            "job_id": str(JOB_ID),
            "organization_id": str(ORGANIZATION_ID),
            "review_id": str(REVIEW_ID),
            "attempt": 1,
            "review_text": (
                "Late delivery. Contact jane.person@example.com at "
                "+1 (415) 555-0123. Visit https://example.com/profile/jane."
            ),
            "detected_pii": [],
            "topic_names": ["Delivery"],
            "complaint_categories": ["Shipping"],
        }])
        self.model_versions: dict[tuple[str, str, str], str] = {}
        self.completed: list[dict[str, Any]] = []
        self.failures: list[dict[str, Any]] = []

    def claim_next_analysis_job(self, max_attempts: int) -> dict[str, Any] | None:
        if not self.jobs:
            return None
        job = self.jobs.popleft()
        if job["attempt"] > max_attempts:
            return None
        return job

    def ensure_model_version(
        self,
        organization_id: UUID,
        provider: str,
        model_name: str,
        model_version: str,
    ) -> str:
        key = (provider, model_name, model_version)
        self.model_versions.setdefault(key, f"model-version-{len(self.model_versions) + 1}")
        return self.model_versions[key]

    def complete_analysis(
        self,
        job_id: UUID,
        model_version_id: str,
        analysis: ReviewAnalysisOutput,
        pii_result: dict[str, Any],
    ) -> None:
        self.completed.append({
            "job_id": job_id,
            "model_version_id": model_version_id,
            "analysis": analysis,
            "pii_result": pii_result,
        })

    def fail_analysis(
        self,
        job_id: UUID,
        model_version_id: str | None,
        failure_code: str,
        retry_delay_seconds: int,
        max_attempts: int,
    ) -> dict[str, Any]:
        current_attempt = 1
        for failure in self.failures:
            if failure["job_id"] == job_id:
                current_attempt += 1
        retry = current_attempt < max_attempts
        self.failures.append({
            "job_id": job_id,
            "model_version_id": model_version_id,
            "failure_code": failure_code,
            "retry_delay_seconds": retry_delay_seconds,
            "retry_scheduled": retry,
        })
        if retry:
            job = {
                "job_id": str(job_id),
                "organization_id": str(ORGANIZATION_ID),
                "review_id": str(REVIEW_ID),
                "attempt": current_attempt + 1,
                "review_text": "Retry after provider failure; contact jane@example.com",
                "detected_pii": [],
                "topic_names": [],
                "complaint_categories": [],
            }
            self.jobs.append(job)
        return {"retry_scheduled": retry, "attempt": current_attempt}


class FakeProvider:
    provider_name = "gemini"
    model_name = "gemini-test"

    def __init__(self, outcomes: list[Any] | None = None) -> None:
        self.outcomes = deque(outcomes or [GOOD_ANALYSIS])
        self.calls: list[dict[str, Any]] = []

    def analyze(
        self,
        sanitized_text: str,
        topics: list[str],
        complaints: list[str],
    ) -> ProviderAnalysis:
        self.calls.append({
            "text": sanitized_text,
            "topics": topics,
            "complaints": complaints,
        })
        outcome = self.outcomes.popleft()
        if isinstance(outcome, Exception):
            raise outcome
        if isinstance(outcome, dict):
            outcome = ReviewAnalysisOutput.model_validate(outcome)
        return ProviderAnalysis(
            analysis=outcome,
            model_version="gemini-test-version",
        )


def _make_service(
    provider: FakeProvider | None = None,
    repository: FakeAnalysisRepository | None = None,
    max_attempts: int = 5,
) -> tuple[ReviewAnalysisService, FakeAnalysisRepository, FakeProvider]:
    repo = repository or FakeAnalysisRepository(max_attempts)
    ai_provider = provider or FakeProvider()
    service = ReviewAnalysisService(
        repository=repo,
        provider=ai_provider,
        settings=Settings(
            gemini_api_key="test-only",
            ai_provider="gemini",
            gemini_model="gemini-test",
            analysis_max_attempts=max_attempts,
        ),
    )
    return service, repo, ai_provider


def test_structured_analysis_rejects_invalid_values_extra_fields_and_duplicates() -> None:
    with pytest.raises(ValidationError):
        ReviewAnalysisOutput.model_validate({
            **GOOD_ANALYSIS,
            "sentiment_score": 2,
        })
    with pytest.raises(ValidationError):
        ReviewAnalysisOutput.model_validate({
            **GOOD_ANALYSIS,
            "unexpected": "unvalidated content",
        })
    with pytest.raises(ValidationError):
        ReviewAnalysisOutput.model_validate({
            **GOOD_ANALYSIS,
            "topics": [
                {"name": "Delivery", "confidence": 0.8},
                {"name": "delivery", "confidence": 0.9},
            ],
        })


def test_gemini_adapter_uses_typed_output_and_only_sanitized_content(monkeypatch) -> None:
    calls: list[dict[str, Any]] = []
    parsed = ReviewAnalysisOutput.model_validate(GOOD_ANALYSIS)

    class FakeInteractions:
        def create(self, **kwargs: Any) -> SimpleNamespace:
            calls.append(kwargs)
            return SimpleNamespace(
                output_text=parsed.model_dump_json(),
                model_version="gemini-3.8-flash",
            )

    class FakeClient:
        def __init__(self, *, api_key: str) -> None:
            assert api_key == "server-only-test-key"
            self.interactions = FakeInteractions()

    monkeypatch.setattr(ai_provider.genai, "Client", FakeClient)
    provider = GeminiReviewAnalysisProvider(
        "server-only-test-key",
        "gemini-3.8-flash",
    )

    result = provider.analyze("Email [REDACTED]", ["Delivery"], ["Shipping"])

    assert result.analysis == parsed
    assert result.model_version == "gemini-3.8-flash"
    assert calls[0]["response_format"]["mime_type"] == "application/json"
    assert (
        calls[0]["response_format"]["schema"]
        == ReviewAnalysisOutput.model_json_schema()
    )
    assert calls[0]["store"] is False
    serialized_input = calls[0]["input"]
    assert "Email [REDACTED]" in serialized_input
    assert "person@example.com" not in serialized_input
    assert "server-only-test-key" not in serialized_input


def test_gemini_adapter_rejects_invalid_json_output(monkeypatch) -> None:
    class FakeInteractions:
        def create(self, **kwargs: Any) -> SimpleNamespace:
            assert kwargs["input"]
            return SimpleNamespace(output_text='{"sentiment":"invalid"}', model_version="v1")

    class FakeClient:
        def __init__(self, *, api_key: str) -> None:
            assert api_key == "server-only-test-key"
            self.interactions = FakeInteractions()

    monkeypatch.setattr(ai_provider.genai, "Client", FakeClient)
    provider = GeminiReviewAnalysisProvider("server-only-test-key", "gemini-test")
    with pytest.raises(AIProviderError, match="invalid structured output"):
        provider.analyze("sanitized", [], [])


def test_provider_factory_constructs_gemini_from_backend_settings() -> None:
    configured = Settings(
        ai_provider=" GEMINI ",
        gemini_api_key="server-only-test-key",
        gemini_model="gemini-test",
        gemini_model_version="gemini-version",
    )
    provider = ai_provider.create_analysis_provider(configured)

    assert isinstance(provider, GeminiReviewAnalysisProvider)
    assert provider.provider_name == "gemini"
    assert provider.model_name == "gemini-test"
    assert provider._configured_model_version == "gemini-version"


def test_gemini_adapter_maps_provider_errors_without_exposing_details(monkeypatch) -> None:
    secret_detail = "upstream message must not reach logs or users"

    class FakeInteractions:
        def create(self, **kwargs: Any) -> SimpleNamespace:
            assert kwargs["input"]
            raise ai_provider.APIError(500, {"message": secret_detail})

    class FakeClient:
        def __init__(self, *, api_key: str) -> None:
            assert api_key == "server-only-test-key"
            self.interactions = FakeInteractions()

    monkeypatch.setattr(ai_provider.genai, "Client", FakeClient)
    provider = GeminiReviewAnalysisProvider("server-only-test-key", "gemini-test")
    with pytest.raises(AIProviderError, match="Gemini provider request failed") as error:
        provider.analyze("sanitized", [], [])
    assert secret_detail not in str(error.value)


def test_pii_protection_redacts_email_phone_url_ssn_and_street_address() -> None:
    result = PIIProtectionService().process(
        "Email a.person@example.com, call +1 (415) 555-0134, "
        "visit https://site.example/me/alex, mail 123 Main Street, "
        "SSN 123-45-6789. Server 192.168.1.25."
    )

    assert result["sanitized_text"].count("[REDACTED]") == 6
    assert all(secret not in result["sanitized_text"] for secret in (
        "a.person@example.com",
        "+1 (415) 555-0134",
        "https://site.example/me/alex",
        "123 Main Street",
        "123-45-6789",
        "192.168.1.25",
    ))
    assert {item["type"] for item in result["detected_pii"]} == {
        "email", "phone", "url", "address", "ssn", "ip_address"
    }


def test_successful_analysis_stores_multiple_topics_complaints_and_model_version() -> None:
    service, repository, provider = _make_service()

    result = service.process_next()

    assert result["status"] == "completed"
    assert len(repository.completed) == 1
    saved = repository.completed[0]
    analysis = saved["analysis"]
    assert analysis.sentiment == "negative"
    assert analysis.sentiment_score == -0.75
    assert [topic.name for topic in analysis.topics] == ["Delivery Delay", "Packaging"]
    assert analysis.topics[0].confidence == 0.91
    assert analysis.complaints[0].category == "Late Delivery"
    assert analysis.complaints[0].severity == "high"
    assert analysis.complaints[0].confidence == 0.88
    assert saved["model_version_id"] == "model-version-2"
    assert ("gemini", "gemini-test", "gemini-test-version") in repository.model_versions
    assert "jane.person@example.com" not in provider.calls[0]["text"]
    assert "+1 (415) 555-0123" not in provider.calls[0]["text"]
    assert "https://example.com/profile/jane" not in provider.calls[0]["text"]
    assert provider.calls[0]["topics"] == ["Delivery"]
    assert provider.calls[0]["complaints"] == ["Shipping"]
    assert {item["type"] for item in saved["pii_result"]["detected_pii"]} == {
        "email", "phone", "url"
    }


def test_provider_failure_is_safe_and_retry_can_succeed(caplog) -> None:
    sensitive_provider_error = (
        "simulated error including secret review text jane.private@example.com"
    )
    provider = FakeProvider([
        AIProviderError(sensitive_provider_error),
        GOOD_ANALYSIS,
    ])
    service, repository, _ = _make_service(provider=provider)

    failed = service.process_next()
    recovered = service.process_next()

    assert failed["status"] == "retry_scheduled"
    assert failed["failure_code"] == "provider_error"
    assert repository.failures[0]["retry_delay_seconds"] == 60
    assert repository.failures[0]["retry_scheduled"] is True
    assert recovered["status"] == "completed"
    assert len(repository.completed) == 1
    assert "jane.private@example.com" not in caplog.text
    assert sensitive_provider_error not in caplog.text


def test_invalid_provider_output_is_failed_not_fabricated() -> None:
    provider = FakeProvider([
        {
            **GOOD_ANALYSIS,
            "sentiment": "mixed",
        }
    ])
    service, repository, _ = _make_service(provider=provider, max_attempts=1)

    result = service.process_next()

    assert result["status"] == "failed"
    assert result["failure_code"] == "invalid_output"
    assert repository.completed == []
    assert repository.failures[0]["retry_scheduled"] is False


def test_worker_returns_idle_when_no_jobs_are_available() -> None:
    repository = FakeAnalysisRepository()
    repository.jobs.clear()
    service, _, _ = _make_service(repository=repository)

    assert service.process_next() == {"status": "idle"}
