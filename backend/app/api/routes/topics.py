from fastapi import APIRouter, HTTPException

from app.data.mock_data import REVIEWS, TOPICS

router = APIRouter(prefix="/topics", tags=["topics"])


@router.get("/")
def list_topics():
    return {"status": "success", "data": TOPICS}


@router.get("/{topic_id}")
def get_topic(topic_id: str):
    topic = next((item for item in TOPICS if item["id"] == topic_id), None)
    if not topic:
        raise HTTPException(status_code=404, detail=f"Topic {topic_id} not found")
    return {"status": "success", "data": topic}


@router.get("/{topic_id}/reviews")
def get_topic_reviews(topic_id: str):
    reviews = [item for item in REVIEWS if topic_id in item["topic_ids"]]
    return {"status": "success", "data": reviews}
