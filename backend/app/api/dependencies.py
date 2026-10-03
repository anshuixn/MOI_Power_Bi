from functools import lru_cache

from app.repositories.review_insight_repository import ReviewInsightRepository
from app.services.analytics_service import AnalyticsService
from app.services.catalog_service import CatalogService
from app.services.review_service import ReviewService


@lru_cache(maxsize=1)
def get_repository() -> ReviewInsightRepository:
    return ReviewInsightRepository()


def get_review_service() -> ReviewService:
    return ReviewService(get_repository())


def get_analytics_service() -> AnalyticsService:
    return AnalyticsService(get_repository())


def get_catalog_service() -> CatalogService:
    return CatalogService(get_repository())
