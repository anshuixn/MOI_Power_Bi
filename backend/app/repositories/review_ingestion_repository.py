from __future__ import annotations

from typing import Any, Protocol
from uuid import UUID


class ReviewIngestionRepository(Protocol):
    def ingestion_catalog(self) -> dict[str, list[dict[str, Any]]]: ...

    def ingest_review(self, review: dict[str, Any]) -> dict[str, Any]: ...

    def create_import_batch(self, file_name: str, user_id: UUID) -> str: ...

    def finish_import_batch(
        self,
        batch_id: str,
        items: list[dict[str, Any]],
        counts: dict[str, int],
    ) -> None: ...

    def get_import_batch(self, batch_id: str) -> dict[str, Any] | None: ...

    def retry_review_analysis(self, review_id: str) -> dict[str, Any]: ...
