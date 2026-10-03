from fastapi import APIRouter, Depends

from app.api.dependencies import get_catalog_service
from app.schemas.common import Result
from app.schemas.insights import Complaint
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("/", response_model=Result[list[Complaint]])
def list_complaints(service: CatalogService = Depends(get_catalog_service)):
    return Result(status="success", data=service.list_complaints()).model_dump()


@router.get("/{complaint_id}", response_model=Result[Complaint])
def get_complaint(
    complaint_id: str,
    service: CatalogService = Depends(get_catalog_service),
):
    return Result(
        status="success",
        data=service.get_complaint(complaint_id),
    ).model_dump()
