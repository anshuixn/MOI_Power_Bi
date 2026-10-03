from __future__ import annotations

from typing import Any
from uuid import UUID

from httpx import HTTPError
from postgrest.exceptions import APIError
from supabase import Client

from app.core.exceptions import DatabaseOperationError
from app.repositories.analysis_job_repository import AnalysisJobRepository
from app.schemas.analysis import ReviewAnalysisOutput
from app.schemas.pii import PIIProcessingResult


class SupabaseAnalysisJobRepository(AnalysisJobRepository):
    """Server-only repository for claiming and completing analysis jobs."""

    def __init__(self, client: Client) -> None:
        self._client = client

    def claim_next_analysis_job(self, max_attempts: int) -> dict[str, Any] | None:
        response = self._execute(
            self._client.rpc(
                "claim_review_analysis_job",
                {"p_max_attempts": max_attempts},
            )
        )
        if response.data is None:
            return None
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Worker claim returned an invalid database response")
        return response.data

    def ensure_model_version(
        self,
        organization_id: UUID,
        provider: str,
        model_name: str,
        model_version: str,
    ) -> str:
        response = self._execute(
            self._client.table("model_versions")
            .upsert(
                {
                    "organization_id": str(organization_id),
                    "provider": provider,
                    "model_name": model_name,
                    "version": model_version,
                    "task": "other",
                    "status": "active",
                },
                on_conflict="organization_id,model_name,version",
            )
            .select("id")
            .single()
        )
        if not isinstance(response.data, dict) or not response.data.get("id"):
            raise DatabaseOperationError("Model version could not be recorded")
        return str(response.data["id"])

    def complete_analysis(
        self,
        job_id: UUID,
        model_version_id: str,
        analysis: ReviewAnalysisOutput,
        pii_result: PIIProcessingResult,
    ) -> None:
        self._execute(
            self._client.rpc(
                "complete_review_analysis",
                {
                    "p_job_id": str(job_id),
                    "p_model_version_id": model_version_id,
                    "p_analysis": analysis.model_dump(mode="json"),
                    "p_sanitized_text": pii_result["sanitized_text"],
                    "p_detected_pii": pii_result["detected_pii"],
                },
            )
        )

    def fail_analysis(
        self,
        job_id: UUID,
        model_version_id: str | None,
        failure_code: str,
        retry_delay_seconds: int,
        max_attempts: int,
    ) -> dict[str, Any]:
        response = self._execute(
            self._client.rpc(
                "fail_review_analysis",
                {
                    "p_job_id": str(job_id),
                    "p_model_version_id": model_version_id,
                    "p_failure_code": failure_code,
                    "p_retry_delay_seconds": retry_delay_seconds,
                    "p_max_attempts": max_attempts,
                },
            )
        )
        if not isinstance(response.data, dict):
            raise DatabaseOperationError("Worker failure update returned invalid data")
        return response.data

    @staticmethod
    def _execute(query: Any) -> Any:
        try:
            return query.execute()
        except (APIError, HTTPError) as exc:
            raise DatabaseOperationError("Analysis job database operation failed") from exc
