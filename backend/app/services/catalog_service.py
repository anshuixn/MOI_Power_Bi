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
        topic = self.repository.get_topic(topic_id)
        if topic is None:
            raise ResourceNotFoundError("Topic", topic_id)
        return topic

    def get_topic_reviews(self, topic_id: str) -> list[DataRecord]:
        if self.repository.get_topic(topic_id) is None:
            raise ResourceNotFoundError("Topic", topic_id)
        return self.repository.get_topic_reviews(topic_id)

    def list_complaints(self) -> list[DataRecord]:
        return self.repository.list_complaints()

    def get_complaint(self, complaint_id: str) -> DataRecord:
        complaint = self.repository.get_complaint(complaint_id)
        if complaint is None:
            raise ResourceNotFoundError("Complaint", complaint_id)
        return complaint

    def list_insights(self, options: dict[str, Any]) -> list[DataRecord]:
        return self.repository.list_insights(options)

    def get_insight(self, insight_id: str) -> DataRecord:
        insight = self.repository.get_insight(insight_id)
        if insight is None:
            raise ResourceNotFoundError("Insight", insight_id)
        return insight

    def list_products(self) -> list[DataRecord]:
        return self.repository.list_products()
