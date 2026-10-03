from fastapi import APIRouter, HTTPException, Query

from app.data.mock_data import INSIGHTS

router = APIRouter(prefix="/insights", tags=["insights"])


@router.get("/")
def list_insights(
    kind: str | None = Query(None),
    impact: str | None = Query(None),
    topic_id: str | None = Query(None),
    product_id: str | None = Query(None),
    min_confidence: float | None = Query(None),
):
    items = list(INSIGHTS)
    if kind:
        items = [item for item in items if item["kind"] == kind]
    if impact:
        items = [item for item in items if item["impact"] == impact]
    if topic_id:
        items = [item for item in items if item.get("topic_id") == topic_id]
    if product_id:
        items = [item for item in items if item.get("product_id") == product_id]
    if min_confidence is not None:
        items = [item for item in items if item["confidence"] >= min_confidence]
    return {"status": "success", "data": items}


@router.get("/{insight_id}")
def get_insight(insight_id: str):
    insight = next((item for item in INSIGHTS if item["id"] == insight_id), None)
    if not insight:
        raise HTTPException(status_code=404, detail=f"Insight {insight_id} not found")
    return {"status": "success", "data": insight}
