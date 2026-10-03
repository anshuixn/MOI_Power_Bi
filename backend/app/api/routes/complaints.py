from fastapi import APIRouter, HTTPException

from app.data.mock_data import COMPLAINTS

router = APIRouter(prefix="/complaints", tags=["complaints"])


@router.get("/")
def list_complaints():
    return {"status": "success", "data": COMPLAINTS}


@router.get("/{complaint_id}")
def get_complaint(complaint_id: str):
    complaint = next((item for item in COMPLAINTS if item["id"] == complaint_id), None)
    if not complaint:
        raise HTTPException(status_code=404, detail=f"Complaint {complaint_id} not found")
    return {"status": "success", "data": complaint}
