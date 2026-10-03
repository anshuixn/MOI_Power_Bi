from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_catalog_service
from app.schemas.common import Result
from app.schemas.insights import Insight
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/", response_model=Result[list[Insight]])
def list_insights(
    kind: str | None = None,
    impact: str | None = None,
    topic_id: str | None = None,
    product_id: str | None = None,
    min_confidence: float | None = Query(None, ge=0, le=1),
    service: CatalogService = Depends(get_catalog_service),
):
    options = {
        "kind": kind,
        "impact": impact,
        "topic_id": topic_id,
        "product_id": product_id,
        "min_confidence": min_confidence,
    }
    return Result(status="success", data=service.list_insights(options)).model_dump()


@router.get("/{insight_id}", response_model=Result[Insight])
def get_insight(
    insight_id: str,
    service: CatalogService = Depends(get_catalog_service),
):
    return Result(status="success", data=service.get_insight(insight_id)).model_dump()
