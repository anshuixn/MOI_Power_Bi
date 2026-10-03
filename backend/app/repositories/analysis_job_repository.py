from __future__ import annotations

from typing import Any, Protocol
from uuid import UUID

from app.schemas.analysis import ReviewAnalysisOutput
from app.schemas.pii import PIIProcessingResult


class AnalysisJobRepository(Protocol):
    def claim_next_analysis_job(self, max_attempts: int) -> dict[str, Any] | None: ...

    def ensure_model_version(
        self,
        organization_id: UUID,
        provider: str,
        model_name: str,
        model_version: str,
    ) -> str: ...

    def complete_analysis(
        self,
        job_id: UUID,
        model_version_id: str,
        analysis: ReviewAnalysisOutput,
        pii_result: PIIProcessingResult,
    ) -> None: ...

    def fail_analysis(
        self,
        job_id: UUID,
        model_version_id: str | None,
        failure_code: str,
        retry_delay_seconds: int,
        max_attempts: int,
    ) -> dict[str, Any]: ...
