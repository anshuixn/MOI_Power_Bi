from __future__ import annotations

from typing import Any

from app.repositories.review_insight_repository import ReviewInsightRepository
from app.services.review_analytics import build_dashboard_summary


class AnalyticsService:
    def __init__(self, repository: ReviewInsightRepository) -> None:
        self.repository = repository

    def get_summary(self, filters: dict[str, Any]) -> dict[str, Any]:
        data = self.repository.dashboard_data()
        data.update({
            "complaints": self.repository.list_complaints(),
            "topics": self.repository.list_topics(),
            "insights": self.repository.list_insights(),
        })
        return build_dashboard_summary(filters, data)
