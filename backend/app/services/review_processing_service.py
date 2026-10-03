from __future__ import annotations

import csv
from datetime import date, datetime, time, timezone
import hashlib
import io
import json
import logging
import re
import unicodedata
from typing import Any
from uuid import UUID

from app.core.exceptions import (
    DatabaseOperationError,
    InvalidRequestError,
    PermissionDeniedError,
    ResourceNotFoundError,
)
from app.repositories.review_ingestion_repository import ReviewIngestionRepository
from app.schemas.ingestion import (
    CreateReviewRequest,
    CsvImportSummary,
    ImportBatchStatus,
    ImportItemResult,
    ImportRowIssue,
    ReviewIngestionResult,
    ReviewAnalysisRetryResult,
)
from app.services.pii_protection_service import PIIProtectionService

logger = logging.getLogger(__name__)

MAX_CSV_BYTES = 5 * 1024 * 1024
MAX_CSV_ROWS = 1000
REQUIRED_CSV_COLUMNS = {"review_text", "rating", "review_date", "source"}
WHITESPACE_PATTERN = re.compile(r"\s+")


class ReviewProcessingService:
    """Normalizes and persists all review inputs through one processing pipeline."""

    def __init__(
        self,
        repository: ReviewIngestionRepository,
        user_id: UUID,
        pii_protection: PIIProtectionService | None = None,
    ) -> None:
        self.repository = repository
        self.user_id = user_id
        self.pii_protection = pii_protection or PIIProtectionService()

    def create_review(self, request: CreateReviewRequest) -> ReviewIngestionResult:
        catalog = self.repository.ingestion_catalog()
        prepared, issues = self._prepare_review(request.model_dump(mode="python"), catalog)
        if issues:
            raise InvalidRequestError("; ".join(issue.message for issue in issues))
        assert prepared is not None
        outcome = self.repository.ingest_review(prepared)
        return ReviewIngestionResult(
            outcome=outcome["outcome"],
            review_id=str(outcome["review_id"]),
            processing_status="queued" if outcome["outcome"] == "accepted" else "duplicate",
        )

    def import_csv(self, file_name: str, content: bytes) -> CsvImportSummary:
        if len(content) > MAX_CSV_BYTES:
            raise InvalidRequestError("CSV file exceeds the 5 MiB upload limit")
        try:
            text = content.decode("utf-8-sig", errors="strict")
        except UnicodeDecodeError as exc:
            raise InvalidRequestError("CSV file must use UTF-8 encoding") from exc
        if not text.strip():
            raise InvalidRequestError("CSV file is empty")

        reader = csv.DictReader(io.StringIO(text, newline=""), strict=True)
        if not reader.fieldnames:
            raise InvalidRequestError("CSV file must include a header row")
        headers = [self._normalize_header(header) for header in reader.fieldnames]
        if len(set(headers)) != len(headers):
            raise InvalidRequestError("CSV contains duplicate column names")
        missing = sorted(REQUIRED_CSV_COLUMNS - set(headers))
        if missing:
            raise InvalidRequestError(
                "CSV is missing required columns: " + ", ".join(missing)
            )
        reader.fieldnames = headers

        rows: list[dict[str, str | None]] = []
        try:
            for row in reader:
                if len(rows) >= MAX_CSV_ROWS:
                    raise InvalidRequestError(
                        f"CSV exceeds the {MAX_CSV_ROWS}-row upload limit"
                    )
                rows.append(row)
        except csv.Error as exc:
            raise InvalidRequestError("CSV contains malformed quoting or row structure") from exc

        catalog = self.repository.ingestion_catalog()
        batch_id = self.repository.create_import_batch(
            self._safe_file_name(file_name), self.user_id
        )
        items: list[dict[str, Any]] = []
        counts = {
            "accepted": 0,
            "rejected": 0,
            "duplicate": 0,
            "processing": 0,
            "failed": 0,
        }

        for row_number, row in enumerate(rows, start=2):
            if None in row:
                items.append(self._item(row_number, "rejected", errors=[
                    ImportRowIssue(field="row", message="Row has more values than the header")
                ]))
                counts["rejected"] += 1
                continue

            prepared, issues = self._prepare_review(row, catalog)
            if issues:
                items.append(self._item(row_number, "rejected", errors=issues))
                counts["rejected"] += 1
                continue

            assert prepared is not None
            prepared["import_batch_id"] = batch_id
            try:
                result = self.repository.ingest_review(prepared)
            except DatabaseOperationError as exc:
                logger.error(
                    "Review import row persistence failed batch_id=%s row_number=%d error_type=%s",
                    batch_id,
                    row_number,
                    type(exc).__name__,
                )
                items.append(self._item(row_number, "failed", errors=[
                    ImportRowIssue(field="row", message="Review could not be stored")
                ]))
                counts["failed"] += 1
                continue

            outcome = result["outcome"]
            items.append(self._item(
                row_number,
                outcome,
                review_id=str(result["review_id"]),
            ))
            counts[outcome] += 1
            if outcome == "accepted":
                counts["processing"] += 1

        self.repository.finish_import_batch(batch_id, items, counts)
        return CsvImportSummary(
            batch_id=batch_id,
            status="completed",
            total_rows=len(rows),
            items=[ImportItemResult.model_validate(item) for item in items],
            **counts,
        )

    def get_import_status(self, batch_id: str) -> ImportBatchStatus:
        try:
            normalized_id = str(UUID(batch_id))
        except ValueError as exc:
            raise InvalidRequestError("batch_id must be a valid UUID") from exc
        batch = self.repository.get_import_batch(normalized_id)
        if batch is None:
            raise ResourceNotFoundError("Import batch", batch_id)
        items = [
            ImportItemResult(
                row_number=row["row_number"],
                status=row["status"],
                review_id=str(row["review_id"]) if row.get("review_id") else None,
                errors=row.get("errors") or [],
            )
            for row in batch.get("items", [])
        ]
        return ImportBatchStatus(
            batch_id=str(batch["id"]),
            status=batch["status"],
            file_name=batch["file_name"],
            created_at=batch["created_at"],
            total_rows=batch["row_count"],
            accepted=batch["accepted_count"],
            rejected=batch["rejected_count"],
            duplicate=batch["duplicate_count"],
            processing=batch["processing_count"],
            failed=batch["failed_count"],
            items=items,
        )

    def retry_analysis(self, review_id: str) -> ReviewAnalysisRetryResult:
        try:
            normalized_id = str(UUID(review_id))
        except ValueError as exc:
            raise InvalidRequestError("review_id must be a valid UUID") from exc
        result = self.repository.retry_review_analysis(normalized_id)
        outcome = result.get("outcome")
        if outcome == "not_found":
            raise ResourceNotFoundError("Review", review_id)
        if outcome == "not_retryable":
            raise InvalidRequestError("Review analysis is not in a retryable failed state")
        if outcome == "forbidden":
            raise PermissionDeniedError("Organization write permission is required")
        if outcome != "queued" or not result.get("job_id"):
            raise DatabaseOperationError("Analysis retry returned an invalid database response")
        return ReviewAnalysisRetryResult(
            job_id=str(result["job_id"]),
            status="queued",
        )

    def _prepare_review(
        self,
        values: dict[str, Any],
        catalog: dict[str, list[dict[str, Any]]],
    ) -> tuple[dict[str, Any] | None, list[ImportRowIssue]]:
        issues: list[ImportRowIssue] = []
        text = self._normalize_text(values.get("review_text"))
        if not text:
            issues.append(ImportRowIssue(field="review_text", message="Review text is required"))
        elif len(text) > 50000:
            issues.append(ImportRowIssue(field="review_text", message="Review text exceeds 50000 characters"))

        rating_value = values.get("rating")
        if isinstance(rating_value, bool):
            rating = None
        elif isinstance(rating_value, int):
            rating = rating_value
        elif isinstance(rating_value, str) and re.fullmatch(r"[1-5]", rating_value.strip()):
            rating = int(rating_value.strip())
        else:
            rating = None
        if rating is None or not 1 <= rating <= 5:
            issues.append(ImportRowIssue(field="rating", message="Rating must be a whole number from 1 to 5"))

        review_date = self._parse_review_date(values.get("review_date"))
        if review_date is None:
            issues.append(ImportRowIssue(field="review_date", message="Review date must be an ISO-8601 date or timestamp"))

        source_value = self._normalize_text(values.get("source"))
        normalized_source = re.sub(r"[\s-]+", "_", source_value.casefold())
        sources = [
            source for source in catalog["sources"]
            if source_value and normalized_source in {
                re.sub(r"[\s-]+", "_", str(source.get("code", "")).casefold()),
                re.sub(
                    r"[\s-]+",
                    "_",
                    str(source.get("display_name", "")).strip().casefold(),
                ),
            }
        ]
        if len(sources) != 1:
            issues.append(ImportRowIssue(
                field="source",
                message="Source must match one configured source code or name",
            ))

        product_value = self._normalize_text(values.get("product"))
        product_id: str | None = None
        if values.get("product_id"):
            product_value = str(values["product_id"]).strip()
            products = [
                product for product in catalog["products"]
                if str(product.get("id")) == product_value
            ]
        elif product_value:
            products = [
                product for product in catalog["products"]
                if product_value.casefold() in {
                    str(product.get("name", "")).casefold(),
                    str(product.get("sku", "")).casefold(),
                }
            ]
        else:
            products = []
        if product_value and len(products) != 1:
            issues.append(ImportRowIssue(
                field="product",
                message="Product must match one configured product name or SKU",
            ))
        elif products:
            product_id = str(products[0]["id"])

        external_id = self._normalize_text(values.get("external_id")) or None
        if external_id and len(external_id) > 255:
            issues.append(ImportRowIssue(field="external_id", message="External ID exceeds 255 characters"))

        if issues:
            return None, issues

        source = sources[0]
        source_id = str(source["id"])
        timestamp = review_date.isoformat()
        pii_result = self.pii_protection.process(text)
        fingerprint = self._content_fingerprint(
            source_id, product_id, review_date, text
        )
        return {
            "external_id": external_id,
            "review_text": text,
            "rating": rating,
            "product_id": product_id,
            "source_id": source_id,
            "review_date": timestamp,
            "content_fingerprint": fingerprint,
            "sanitized_text": pii_result["sanitized_text"],
            "detected_pii": pii_result["detected_pii"],
        }, []

    @staticmethod
    def _normalize_text(value: Any) -> str:
        if value is None:
            return ""
        return WHITESPACE_PATTERN.sub(
            " ", unicodedata.normalize("NFC", str(value)).replace("\ufeff", "")
        ).strip()

    @staticmethod
    def _normalize_header(value: str | None) -> str:
        header = (value or "").strip().casefold()
        return re.sub(r"[\s-]+", "_", header)

    @staticmethod
    def _parse_review_date(value: Any) -> datetime | None:
        if isinstance(value, datetime):
            parsed = value
        elif isinstance(value, date):
            parsed = datetime.combine(value, time.min)
        elif isinstance(value, str) and value.strip():
            date_value = value.strip()
            if date_value.endswith("Z"):
                date_value = date_value[:-1] + "+00:00"
            try:
                parsed = datetime.fromisoformat(date_value)
            except ValueError:
                return None
        else:
            return None
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=timezone.utc)
        return parsed.astimezone(timezone.utc)

    @staticmethod
    def _content_fingerprint(
        source_id: str,
        product_id: str | None,
        review_date: datetime,
        review_text: str,
    ) -> str:
        canonical = json.dumps(
            [
                source_id,
                product_id or "",
                review_date.date().isoformat(),
                WHITESPACE_PATTERN.sub(" ", review_text).strip().casefold(),
            ],
            ensure_ascii=False,
            separators=(",", ":"),
        )
        return hashlib.sha256(canonical.encode("utf-8")).hexdigest()

    @staticmethod
    def _safe_file_name(file_name: str) -> str:
        name = file_name.replace("\\", "/").split("/")[-1].strip()
        if not name:
            return "reviews.csv"
        return name[:255]

    @staticmethod
    def _item(
        row_number: int,
        status: str,
        review_id: str | None = None,
        errors: list[ImportRowIssue] | None = None,
    ) -> dict[str, Any]:
        return {
            "row_number": row_number,
            "status": status,
            "review_id": review_id,
            "errors": [issue.model_dump() for issue in errors or []],
        }
