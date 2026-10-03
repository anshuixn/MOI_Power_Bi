from fastapi import APIRouter, Depends

from app.api.dependencies import get_catalog_service
from app.schemas.common import Result
from app.schemas.insights import Topic
from app.schemas.review import Review
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("/", response_model=Result[list[Topic]])
def list_topics(service: CatalogService = Depends(get_catalog_service)):
    return Result(status="success", data=service.list_topics()).model_dump()


@router.get("/{topic_id}", response_model=Result[Topic])
def get_topic(
    topic_id: str,
    service: CatalogService = Depends(get_catalog_service),
):
    return Result(status="success", data=service.get_topic(topic_id)).model_dump()


@router.get("/{topic_id}/reviews", response_model=Result[list[Review]])
def get_topic_reviews(
    topic_id: str,
    service: CatalogService = Depends(get_catalog_service),
):
    return Result(status="success", data=service.get_topic_reviews(topic_id)).model_dump()
