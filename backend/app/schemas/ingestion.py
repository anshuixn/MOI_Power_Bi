from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StrictInt


class CreateReviewRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    review_text: str = Field(min_length=1, max_length=50000)
    rating: StrictInt = Field(ge=1, le=5)
    source: str = Field(min_length=1, max_length=120)
    review_date: datetime
    product_id: UUID | None = None
    external_id: str | None = Field(default=None, max_length=255)


class ReviewIngestionResult(BaseModel):
    outcome: Literal["accepted", "duplicate"]
    review_id: str
    processing_status: Literal["queued", "duplicate"]


class ReviewAnalysisRetryResult(BaseModel):
    job_id: str
    status: Literal["queued"]


class ImportRowIssue(BaseModel):
    field: str
    message: str


class ImportItemResult(BaseModel):
    row_number: int
    status: Literal["accepted", "duplicate", "rejected", "failed"]
    review_id: str | None = None
    errors: list[ImportRowIssue] = Field(default_factory=list)


class CsvImportSummary(BaseModel):
    batch_id: str
    status: Literal["completed"]
    total_rows: int
    accepted: int
    rejected: int
    duplicate: int
    processing: int
    failed: int
    items: list[ImportItemResult]


class ImportBatchStatus(CsvImportSummary):
    status: Literal["pending", "processing", "completed", "failed", "cancelled"]
    file_name: str
    created_at: datetime
