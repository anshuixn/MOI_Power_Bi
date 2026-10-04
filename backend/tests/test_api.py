from app.core.config import Settings
from fastapi.testclient import TestClient

from app.main import app


def test_health_endpoint(client) -> None:
    for path in ("/health", "/api/v1/health"):
        response = client.get(path)
        assert response.status_code == 200
        payload = response.json()
        assert payload["status"] == "ok"


def test_reviews_endpoint(client) -> None:
    response = client.get("/reviews/?page=1&pageSize=5")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["total"] >= 1
    assert len(payload["data"]["items"]) <= 5


def test_versioned_reviews_and_not_found_error_contract(client) -> None:
    response = client.get("/api/v1/reviews/?page=1&pageSize=5")
    assert response.status_code == 200
    assert response.json()["status"] == "success"

    missing = client.get("/api/v1/reviews/not-a-real-review")
    assert missing.status_code == 404
    assert missing.json() == {
        "status": "error",
        "error": "Review not-a-real-review not found",
        "code": 404,
    }


def test_validation_error_has_standard_response_shape(client) -> None:
    response = client.get("/reviews/?pageSize=0")
    assert response.status_code == 422
    payload = response.json()
    assert payload["status"] == "error"
    assert payload["error"] == "Request validation failed"
    assert payload["code"] == 422
    assert payload["details"]


def test_analytics_summary_endpoint(client) -> None:
    response = client.get("/analytics/summary?dateRange=last_30_days")
    assert response.status_code == 200
    payload = response.json()
    assert payload["status"] == "success"
    assert payload["data"]["totalReviews"]["value"] > 0
    assert "sentiment" in payload["data"]
    assert "reviewVolume" in payload["data"]
    assert "positiveSentiment" in payload["data"]
    assert "positive_sentiment" not in payload["data"]


def test_insights_and_topics_endpoints(client) -> None:
    topics = client.get("/topics/")
    assert topics.status_code == 200
    assert topics.json()["status"] == "success"

    insights = client.get("/insights/")
    assert insights.status_code == 200
    assert insights.json()["status"] == "success"


def test_existing_catalog_routes_and_custom_date_validation(client) -> None:
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


def test_analytics_and_catalog_filters_validate_and_paginate(client) -> None:
    invalid_filter = client.get(
        "/api/v1/analytics/summary?source=unknown-source"
    )
    assert invalid_filter.status_code == 422

    invalid_product = client.get(
        "/api/v1/topics/?productId=not-a-uuid"
    )
    assert invalid_product.status_code == 422

    paginated = client.get(
        "/api/v1/topics/product-quality/reviews?page=1&pageSize=1"
    )
    assert paginated.status_code == 200
    data = paginated.json()["data"]
    assert data["total"] == 4
    assert len(data["items"]) == 1
    assert data["pageSize"] == 1
    assert data["pageCount"] == 4
    topic = client.get("/api/v1/topics/").json()["data"][0]
    assert "positivePct" in topic
    assert "positive_pct" not in topic

    complaint_reviews = client.get(
        "/api/v1/complaints/late-delivery/reviews?pageSize=1"
    )
    assert complaint_reviews.status_code == 200
    assert complaint_reviews.json()["data"]["total"] == 2
    assert len(complaint_reviews.json()["data"]["items"]) == 1


def test_insight_generation_and_model_health_require_organization_auth() -> None:
    with TestClient(app) as unauthenticated_client:
        headers = {
            "X-Organization-ID": "11111111-1111-4111-8111-111111111111",
        }
        for path in (
            "/api/v1/model-health/",
            "/api/v1/insights/",
        ):
            response = unauthenticated_client.get(path, headers=headers)
            assert response.status_code == 401
        generated = unauthenticated_client.post(
            "/api/v1/insights/generate",
            headers=headers,
        )
        assert generated.status_code == 401


def test_settings_read_environment_values(monkeypatch) -> None:
    monkeypatch.setenv("FRONTEND_URL", "https://reviewband.example")
    monkeypatch.setenv("SUPABASE_URL", "https://project.supabase.co")
    monkeypatch.setenv("SUPABASE_PUBLISHABLE_KEY", "test-publishable-key")
    monkeypatch.setenv("SUPABASE_SECRET_KEY", "test-secret-key")
    monkeypatch.setenv("GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setenv("GEMINI_MODEL", "gemini-test")

    configured = Settings()
    assert configured.frontend_url == "https://reviewband.example"
    assert configured.supabase_url == "https://project.supabase.co"
    assert configured.supabase_anon_key == "test-publishable-key"
    assert configured.supabase_service_role_key == "test-secret-key"
    assert configured.gemini_api_key == "test-gemini-key"
    assert configured.gemini_model == "gemini-test"


def test_database_backed_routes_require_authentication() -> None:
    with TestClient(app) as unauthenticated_client:
        response = unauthenticated_client.get(
            "/api/v1/reviews/",
            headers={"X-Organization-ID": "11111111-1111-4111-8111-111111111111"},
        )
    assert response.status_code == 401
    assert response.json()["error"] == "Bearer authentication is required"
