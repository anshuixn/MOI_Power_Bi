from fastapi.testclient import TestClient

from app.core.config import Settings
from app.main import app

client = TestClient(app)


def test_health_endpoint() -> None:
    for path in ("/health", "/api/v1/health"):
        response = client.get(path)
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


def test_versioned_reviews_and_not_found_error_contract() -> None:
    response = client.get("/api/v1/reviews/?page=1&page_size=5")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    missing = client.get("/api/v1/reviews/not-a-real-review")
    assert missing.status_code == 404
    assert missing.json() == {
        "status": "error",
        "error": "Review not-a-real-review not found",
        "code": 404,
    }


def test_validation_error_has_standard_response_shape() -> None:
    response = client.get("/reviews/?page_size=0")
    assert response.status_code == 422
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["error"] == "Request validation failed"
    assert payload["code"] == 422
    assert payload["details"]


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


def test_existing_catalog_routes_and_custom_date_validation() -> None:
    for path in ("/complaints/", "/api/v1/complaints/", "/api/v1/topics/", "/api/v1/insights/"):
        response = client.get(path)
        assert response.status_code == 200
        assert response.json()["status"] == "success"

    invalid_dates = client.get("/api/v1/analytics/summary?dateRange=custom")
    assert invalid_dates.status_code == 422
    assert invalid_dates.json()["status"] == "error"

    reversed_dates = client.get(
        "/api/v1/analytics/summary?dateRange=custom&dateStart=2026-10-03&dateEnd=2026-10-02"
    )
    assert reversed_dates.status_code == 422
    assert reversed_dates.json()["error"] == "dateEnd must be on or after dateStart"


def test_settings_read_environment_values(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "https://reviewband.example")
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("OPENAI_API_KEY", "test-key-placeholder")

    configured = Settings()
    assert configured.frontend_url == "https://reviewband.example"
    assert configured.supabase_url == "https://project.supabase.co"
    assert configured.openai_api_key == "test-key-placeholder"
