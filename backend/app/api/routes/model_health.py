from fastapi import APIRouter, Depends, Query

from app.api.dependencies import get_model_health_service
from app.schemas.common import Result
from app.schemas.insights import ModelHealth
from app.services.model_health_service import ModelHealthService

router = APIRouter(prefix="/model-health", tags=["model-health"])


@router.get("/", response_model=Result[ModelHealth])
def get_model_health(
    days: int = Query(30, ge=1, le=365),
    service: ModelHealthService = Depends(get_model_health_service),
):
    return Result(
        status="success",
        data=service.get_health(days),
    ).model_dump()
