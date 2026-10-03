from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "ok"


def test_reviews_endpoint() -> None:
    response = client.get("/reviews/?page=1&page_size=5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["total"] >= 1
    assert len(payload["data"]["items"]) <= 5


def test_analytics_summary_endpoint() -> None:
    response = client.get("/analytics/summary?dateRange=last_30_days")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["total_reviews"]["value"] > 0
    assert "sentiment" in payload["data"]


def test_insights_and_topics_endpoints() -> None:
    topics = client.get("/topics/")
    assert topics.status_code == 200
    assert topics.json()["status"] == "success"

    insights = client.get("/insights/")
    assert insights.status_code == 200
    assert insights.json()["status"] == "success"
