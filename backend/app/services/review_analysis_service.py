from __future__ import annotations

from logging import getLogger
from typing import Any
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, ValidationError

from app.core.config import Settings
from app.integrations.ai_provider import (
    AIProviderError,
    ProviderAnalysis,
    ReviewAnalysisProvider,
)
from app.repositories.analysis_job_repository import AnalysisJobRepository
from app.schemas.analysis import ReviewAnalysisOutput
from app.services.pii_protection_service import DetectedPII, PIIProtectionService

logger = getLogger(__name__)


class ClaimedAnalysisJob(BaseModel):
    model_config = ConfigDict(extra="forbid")

    job_id: UUID
    organization_id: UUID
    review_id: UUID
    attempt: int = Field(ge=1)
    review_text: str
    detected_pii: list[dict[str, str]] = Field(default_factory=list)
    topic_names: list[str] = Field(default_factory=list)
    complaint_categories: list[str] = Field(default_factory=list)


class ReviewAnalysisService:
    """Consumes queued review jobs, validates provider output, and persists results."""

    def __init__(
        self,
        repository: AnalysisJobRepository,
        provider: ReviewAnalysisProvider,
        settings: Settings,
        pii_protection: PIIProtectionService | None = None,
    ) -> None:
        if not 1 <= settings.analysis_max_attempts <= 20:
            raise ValueError("ANALYSIS_MAX_ATTEMPTS must be between 1 and 20")
        self.repository = repository
        self.provider = provider
        self.settings = settings
        self.pii_protection = pii_protection or PIIProtectionService()

    def process_next(self) -> dict[str, Any]:
        raw_job = self.repository.claim_next_analysis_job(
            self.settings.analysis_max_attempts
        )
        if raw_job is None:
            return {"status": "idle"}

        job = ClaimedAnalysisJob.model_validate(raw_job)
        model_version_id: str | None = None
        failure_code = "processing_error"
        try:
            model_version_id = self.repository.ensure_model_version(
                job.organization_id,
                self.provider.provider_name,
                self.provider.model_name,
                self.provider.model_name,
            )
            pii_result = self.pii_protection.process(job.review_text)
            pii_result["detected_pii"] = self._merge_pii(
                job.detected_pii,
                pii_result["detected_pii"],
            )
            provider_result = self.provider.analyze(
                pii_result["sanitized_text"],
                job.topic_names,
                job.complaint_categories,
            )
            analysis = ReviewAnalysisOutput.model_validate(
                provider_result.analysis
            )
            model_version_id = self._ensure_result_model_version(
                job.organization_id,
                provider_result,
                model_version_id,
            )
            self.repository.complete_analysis(
                job.job_id,
                model_version_id,
                analysis,
                pii_result,
            )
            return {
                "status": "completed",
                "job_id": str(job.job_id),
                "review_id": str(job.review_id),
                "model_version_id": model_version_id,
            }
        except AIProviderError as exc:
            failure_code = "provider_error"
            return self._record_failure(job, model_version_id, failure_code, exc)
        except ValidationError as exc:
            failure_code = "invalid_output"
            return self._record_failure(job, model_version_id, failure_code, exc)
        except Exception as exc:
            return self._record_failure(job, model_version_id, failure_code, exc)

    def _ensure_result_model_version(
        self,
        organization_id: UUID,
        result: ProviderAnalysis,
        current_version_id: str,
    ) -> str:
        model_version = result.model_version.strip()[:80] or self.provider.model_name
        if model_version == self.provider.model_name:
            return current_version_id
        return self.repository.ensure_model_version(
            organization_id,
            self.provider.provider_name,
            self.provider.model_name,
            model_version,
        )

    def _record_failure(
        self,
        job: ClaimedAnalysisJob,
        model_version_id: str | None,
        failure_code: str,
        error: Exception,
    ) -> dict[str, Any]:
        logger.error(
            "Review analysis failed job_id=%s review_id=%s attempt=%d error_type=%s",
            job.job_id,
            job.review_id,
            job.attempt,
            type(error).__name__,
        )
        retry_delay_seconds = min(60 * (2 ** (job.attempt - 1)), 3600)
        failure = self.repository.fail_analysis(
            job.job_id,
            model_version_id,
            failure_code,
            retry_delay_seconds,
            self.settings.analysis_max_attempts,
        )
        return {
            "status": "retry_scheduled" if failure["retry_scheduled"] else "failed",
            "job_id": str(job.job_id),
            "review_id": str(job.review_id),
            "failure_code": failure_code,
            "attempt": failure["attempt"],
        }

    @staticmethod
    def _merge_pii(
        stored: list[dict[str, str]],
        detected: list[DetectedPII],
    ) -> list[DetectedPII]:
        merged: dict[tuple[str, str], DetectedPII] = {}
        for item in [*stored, *detected]:
            identifier_type = item.get("type")
            field = item.get("field")
            if identifier_type and field:
                merged[(identifier_type, field)] = {
                    "type": identifier_type,
                    "field": field,
                }
        return list(merged.values())
