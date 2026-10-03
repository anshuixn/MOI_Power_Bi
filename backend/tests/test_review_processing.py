from __future__ import annotations

from datetime import datetime, timezone
import io
from uuid import UUID, uuid4

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.api.dependencies import get_review_processing_service
from app.core.exceptions import DatabaseOperationError, InvalidRequestError
from app.main import app
from app.schemas.ingestion import CreateReviewRequest
from app.services.review_processing_service import ReviewProcessingService

SOURCE_ID = "11111111-1111-4111-8111-111111111111"
PRODUCT_ID = "22222222-2222-4222-8222-222222222222"
USER_ID = UUID("33333333-3333-4333-8333-333333333333")


class MemoryIngestionRepository:
    def __init__(self) -> None:
        self.reviews: dict[str, dict] = {}
        self.batches: dict[str, dict] = {}
        self.fail_next_review = False

    def ingestion_catalog(self) -> dict[str, list[dict]]:
        return {
            "sources": [{
                "id": SOURCE_ID,
                "code": "web_store",
                "display_name": "Web Store",
            }],
            "products": [{
                "id": PRODUCT_ID,
                "name": "Widget",
                "sku": "W-1",
            }],
        }

    def ingest_review(self, review: dict) -> dict:
        if self.fail_next_review:
            self.fail_next_review = False
            raise DatabaseOperationError("database unavailable")
        duplicate_id = next(
            (
                review_id for review_id, existing in self.reviews.items()
                if existing["source_id"] == review["source_id"]
                and (
                    (
                        review.get("external_id")
                        and existing.get("external_id") == review["external_id"]
                    )
                    or existing["content_fingerprint"] == review["content_fingerprint"]
                )
            ),
            None,
        )
        if duplicate_id:
            return {"outcome": "duplicate", "review_id": duplicate_id}
        review_id = str(uuid4())
        self.reviews[review_id] = dict(review)
        return {"outcome": "accepted", "review_id": review_id}

    def create_import_batch(self, file_name: str, user_id: UUID) -> str:
        batch_id = str(uuid4())
        self.batches[batch_id] = {
            "id": batch_id,
            "file_name": file_name,
            "status": "processing",
            "created_at": datetime(2026, 1, 1, tzinfo=timezone.utc),
            "items": [],
        }
        return batch_id

    def finish_import_batch(self, batch_id: str, items: list[dict], counts: dict[str, int]) -> None:
        self.batches[batch_id].update({
            "status": "completed",
            "row_count": len(items),
            "items": items,
            **{f"{key}_count": value for key, value in counts.items()},
        })

    def get_import_batch(self, batch_id: str) -> dict | None:
        return self.batches.get(batch_id)

    def retry_review_analysis(self, review_id: str) -> dict:
        del review_id
        return {"outcome": "queued", "job_id": str(uuid4())}


def _make_service(repository: MemoryIngestionRepository | None = None):
    repo = repository or MemoryIngestionRepository()
    return ReviewProcessingService(repo, USER_ID), repo


def _request(
    text: str = "  Excellent   build  ",
    rating: int = 5,
    review_date: str = "2026-10-01T12:00:00Z",
    source: str = "web_store",
    **extra,
) -> CreateReviewRequest:
    return CreateReviewRequest(
        review_text=text,
        rating=rating,
        review_date=review_date,
        source=source,
        **extra,
    )


def test_valid_review_is_normalized_sanitized_and_queued() -> None:
    service, repository = _make_service()

    result = service.create_review(
        _request(text="  Helpful\tproduct from person@example.com  ")
    )

    stored = repository.reviews[result.review_id]
    assert result.outcome == "accepted"
    assert result.processing_status == "queued"
    assert stored["review_text"] == "Helpful product from person@example.com"
    assert stored["sanitized_text"] == "Helpful product from [REDACTED]"
    assert stored["detected_pii"] == [{"type": "email", "field": "review_text"}]
    assert stored["review_date"] == "2026-10-01T12:00:00+00:00"


def test_review_validation_rejects_empty_text_and_invalid_rating() -> None:
    service, _ = _make_service()

    with pytest.raises(InvalidRequestError, match="Review text is required"):
        service.create_review(_request(text="   "))
    with pytest.raises(ValidationError):
        _request(rating=6)
    with pytest.raises(ValidationError):
        _request(rating=True)


def test_duplicate_review_uses_deterministic_content_fingerprint() -> None:
    service, repository = _make_service()

    first = service.create_review(_request(text="A useful review"))
    duplicate = service.create_review(_request(text=" a   useful REVIEW "))

    assert first.outcome == "accepted"
    assert duplicate.outcome == "duplicate"
    assert duplicate.review_id == first.review_id
    assert len(repository.reviews) == 1


def test_source_names_normalize_whitespace_and_hyphens() -> None:
    service, _ = _make_service()

    result = service.create_review(_request(source="  WEB-STORE "))

    assert result.outcome == "accepted"


def test_csv_import_summarizes_accepted_duplicate_and_invalid_rows() -> None:
    service, repository = _make_service()
    csv_content = (
        "\ufeffReview Text,Rating,Review Date,Source,Product,External ID\n"
        '"A quality item from person@example.com",5,2026-10-01,Web Store,Widget,review-1\n'
        '"a   QUALITY item from person@example.com",5,2026-10-01,web_store,Widget,\n'
        "Bad rating,8,2026-10-02,web_store,Widget,\n"
        "Bad date,4,not-a-date,web_store,Widget,\n"
        "Too,many,values,for,the,columns,here\n"
    ).encode("utf-8")

    summary = service.import_csv("folder/reviews.csv", csv_content)

    assert summary.total_rows == 5
    assert (summary.accepted, summary.duplicate, summary.rejected) == (1, 1, 3)
    assert summary.processing == 1
    assert summary.failed == 0
    assert summary.items[0].row_number == 2
    assert summary.items[0].status == "accepted"
    assert summary.items[1].status == "duplicate"
    assert summary.items[2].errors[0].field == "rating"
    assert summary.items[3].errors[0].field == "review_date"
    assert summary.items[4].errors[0].field == "row"
    assert repository.batches[summary.batch_id]["file_name"] == "reviews.csv"
    assert service.get_import_status(summary.batch_id).accepted == 1


def test_csv_rejects_missing_columns_and_malformed_csv() -> None:
    service, _ = _make_service()

    with pytest.raises(InvalidRequestError, match="missing required columns"):
        service.import_csv("reviews.csv", b"review_text,rating\nvalue,5\n")
    with pytest.raises(InvalidRequestError, match="malformed quoting"):
        service.import_csv(
            "reviews.csv",
            b'review_text,rating,review_date,source\n"unclosed,5,2026-10-01,web_store\n',
        )
    with pytest.raises(InvalidRequestError, match="UTF-8"):
        service.import_csv("reviews.csv", b"\xff")


def test_csv_empty_fields_and_unconfigured_source_are_reported() -> None:
    service, _ = _make_service()
    content = (
        "review_text,rating,review_date,source\n"
        ",2,2026-10-01,other_source\n"
    ).encode()

    summary = service.import_csv("reviews.csv", content)

    assert summary.rejected == 1
    assert {issue.field for issue in summary.items[0].errors} == {
        "review_text", "source"
    }


def test_csv_rejects_oversized_upload() -> None:
    service, _ = _make_service()
    with pytest.raises(InvalidRequestError, match="5 MiB"):
        service.import_csv("reviews.csv", b"x" * (5 * 1024 * 1024 + 1))


def test_manual_analysis_retry_returns_a_queued_job() -> None:
    service, _ = _make_service()
    result = service.retry_analysis(str(uuid4()))

    assert result.status == "queued"
    assert result.job_id


def test_csv_reports_storage_failure_separately_from_validation_rejection() -> None:
    service, repository = _make_service()
    repository.fail_next_review = True

    summary = service.import_csv(
        "reviews.csv",
        b"review_text,rating,review_date,source\n"
        b"Valid review,4,2026-10-02,web_store\n",
    )

    assert summary.accepted == 0
    assert summary.processing == 0
    assert summary.rejected == 0
    assert summary.failed == 1
    assert summary.items[0].status == "failed"
    assert summary.items[0].errors[0].message == "Review could not be stored"


def test_review_ingestion_endpoints_create_and_report_csv_import_status() -> None:
    service, _ = _make_service()
    app.dependency_overrides[get_review_processing_service] = lambda: service
    try:
        with TestClient(app) as client:
            created = client.post(
                "/api/v1/reviews",
                json={
                    "review_text": "Great product",
                    "rating": 5,
                    "source": "web_store",
                    "review_date": "2026-10-01",
                    "product_id": PRODUCT_ID,
                },
            )
            assert created.status_code == 200
            assert created.json()["data"]["outcome"] == "accepted"

            invalid = client.post(
                "/api/v1/reviews",
                json={
                    "review_text": "Invalid rating",
                    "rating": 0,
                    "source": "web_store",
                    "review_date": "not-a-date",
                },
            )
            assert invalid.status_code == 422
            assert invalid.json()["error"] == "Request validation failed"

            imported = client.post(
                "/api/v1/reviews/import",
                files={
                    "file": (
                        "reviews.csv",
                        io.BytesIO(
                            b"review_text,rating,review_date,source\n"
                            b"CSV review,4,2026-10-02,web_store\n"
                        ),
                        "text/csv",
                    )
                },
            )
            assert imported.status_code == 200
            data = imported.json()["data"]
            assert data["accepted"] == 1
            assert data["processing"] == 1

            status = client.get(f"/api/v1/reviews/imports/{data['batch_id']}")
            assert status.status_code == 200
            assert status.json()["data"]["status"] == "completed"
            assert status.json()["data"]["items"][0]["row_number"] == 2

            retried = client.post(
                f"/api/v1/reviews/{uuid4()}/analysis/retry"
            )
            assert retried.status_code == 200
            assert retried.json()["data"]["status"] == "queued"
    finally:
        app.dependency_overrides.pop(get_review_processing_service, None)
