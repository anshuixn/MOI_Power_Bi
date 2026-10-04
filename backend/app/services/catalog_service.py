from __future__ import annotations

from typing import Any

from app.core.exceptions import ResourceNotFoundError
from app.repositories.review_insight_repository import DataRecord, ReviewInsightRepository
from app.services.date_range import date_window


class CatalogService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def list_topics(self, filters: dict[str, Any]) -> list[DataRecord]:
        return self.repository.list_topics(self._catalog_filters(filters))

    def get_topic(self, topic_id: str, filters: dict[str, Any]) -> DataRecord:
        topic = self.repository.get_topic(
            topic_id, self._catalog_filters(filters)
        )
        if topic is None:
            raise ResourceNotFoundError("Topic", topic_id)
        return topic

    def get_topic_reviews(
        self, topic_id: str, filters: dict[str, Any]
    ) -> dict[str, Any]:
        query_filters = self._catalog_filters(filters)
        if self.repository.get_topic(topic_id, query_filters) is None:
            raise ResourceNotFoundError("Topic", topic_id)
        return self.repository.get_topic_reviews(topic_id, {
            **query_filters,
            **filters,
            "topic_id": topic_id,
        })

    def list_complaints(self, filters: dict[str, Any]) -> list[DataRecord]:
        return self.repository.list_complaints(self._catalog_filters(filters))

    def get_complaint(
        self, complaint_id: str, filters: dict[str, Any]
    ) -> DataRecord:
        complaint = self.repository.get_complaint(
            complaint_id, self._catalog_filters(filters)
        )
        if complaint is None:
            raise ResourceNotFoundError("Complaint", complaint_id)
        return complaint

    def get_complaint_reviews(
        self, complaint_id: str, filters: dict[str, Any]
    ) -> dict[str, Any]:
        query_filters = self._catalog_filters(filters)
        if self.repository.get_complaint(complaint_id, query_filters) is None:
            raise ResourceNotFoundError("Complaint", complaint_id)
        return self.repository.get_complaint_reviews(complaint_id, {
            **query_filters,
            **filters,
            "complaint_id": complaint_id,
        })

    def list_insights(self, options: dict[str, Any]) -> list[DataRecord]:
        return self.repository.list_insights(options)

    def get_insight(self, insight_id: str) -> DataRecord:
        insight = self.repository.get_insight(insight_id)
        if insight is None:
            raise ResourceNotFoundError("Insight", insight_id)
        return insight

    def list_products(self) -> list[DataRecord]:
        return self.repository.list_products()

    @staticmethod
    def _catalog_filters(filters: dict[str, Any]) -> dict[str, Any]:
        return {
            **date_window(filters),
            "product_id": filters.get("product_id"),
            "source": filters.get("source"),
            "sentiment": filters.get("sentiment"),
            "topic_id": filters.get("topic_id"),
            "complaint_id": filters.get("complaint_id"),
            "severity": filters.get("severity"),
            "status": filters.get("status"),
        }
