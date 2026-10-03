from __future__ import annotations

from typing import Any

from app.core.exceptions import ResourceNotFoundError
from app.repositories.review_insight_repository import DataRecord, ReviewInsightRepository


class CatalogService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def list_topics(self) -> list[DataRecord]:
        return self.repository.list_topics()

    def get_topic(self, topic_id: str) -> DataRecord:
        topic = next(
            (item for item in self.repository.list_topics() if item["id"] == topic_id),
            None,
        )
        if topic is None:
            raise ResourceNotFoundError("Topic", topic_id)
        return topic

    def get_topic_reviews(self, topic_id: str) -> list[DataRecord]:
        return [
            review for review in self.repository.list_reviews()
            if topic_id in review["topic_ids"]
        ]

    def list_complaints(self) -> list[DataRecord]:
        return self.repository.list_complaints()

    def get_complaint(self, complaint_id: str) -> DataRecord:
        complaint = next(
            (item for item in self.repository.list_complaints() if item["id"] == complaint_id),
            None,
        )
        if complaint is None:
            raise ResourceNotFoundError("Complaint", complaint_id)
        return complaint

    def list_insights(self, options: dict[str, Any]) -> list[DataRecord]:
        items = self.repository.list_insights()
        for key in ("kind", "impact", "topic_id", "product_id"):
            value = options.get(key)
            if value:
                items = [item for item in items if item.get(key) == value]
        min_confidence = options.get("min_confidence")
        if min_confidence is not None:
            items = [item for item in items if item["confidence"] >= min_confidence]
        return items

    def get_insight(self, insight_id: str) -> DataRecord:
        insight = next(
            (item for item in self.repository.list_insights() if item["id"] == insight_id),
            None,
        )
        if insight is None:
            raise ResourceNotFoundError("Insight", insight_id)
        return insight

    def list_products(self) -> list[DataRecord]:
        return self.repository.list_products()
