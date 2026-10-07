from types import SimpleNamespace
from uuid import UUID

from fastapi import HTTPException
from fastapi.security import HTTPAuthorizationCredentials

from app.api import dependencies
from app.core.config import Settings
from app.integrations import supabase as supabase_integration
from app.repositories.supabase_review_insight_repository import (
    SupabaseReviewInsightRepository,
)


class FakeQuery:
    def __init__(self, data, count=None):
        self.response = SimpleNamespace(data=data, count=count)
        self.calls = []

    def select(self, *args, **kwargs):
        self.calls.append(("select", args, kwargs))
        return self

    def eq(self, *args):
        self.calls.append(("eq", args))
        return self

    def ilike(self, *args):
        self.calls.append(("ilike", args))
        return self

    def gte(self, *args):
        self.calls.append(("gte", args))
        return self

    def lt(self, *args):
        self.calls.append(("lt", args))
        return self

    def order(self, *args, **kwargs):
        self.calls.append(("order", args, kwargs))
        return self

    def range(self, *args):
        self.calls.append(("range", args))
        return self

    def in_(self, *args):
        self.calls.append(("in", args))
        return self

    def maybe_single(self):
        self.calls.append(("maybe_single",))
        return self

    def execute(self):
        return self.response


class FakeClient:
    def __init__(self, query):
        self.query = query
        self.rpc_calls = []

    def table(self, _table):
        return self.query

    def rpc(self, name, params):
        self.rpc_calls.append((name, params))
        return self.query


def test_review_repository_scopes_filters_paginates_and_redacts_output() -> None:
    organization_id = UUID("11111111-1111-4111-8111-111111111111")
    row = {
        "id": "22222222-2222-4222-8222-222222222222",
        "external_id": "source-review-1",
        "review_text": "raw email: person@example.com",
        "rating": 2,
        "product_id": "33333333-3333-4333-8333-333333333333",
        "source_id": "44444444-4444-4444-8444-444444444444",
        "review_date": "2026-10-01T12:00:00+00:00",
        "processing_status": "processed",
        "product": {"name": "Example product"},
        "source": {"code": "web_store"},
        "analysis": {
            "sentiment": "negative",
            "sentiment_score": -0.8,
            "sentiment_confidence": 0.94,
            "sanitized_text": "raw email: [REDACTED]",
            "detected_pii": [{"type": "email", "field": "review_text"}],
            "processed_at": "2026-10-01T12:05:00+00:00",
        },
        "topic_links": [{"topic_id": "55555555-5555-4555-8555-555555555555"}],
        "complaint_links": [],
    }
    query = FakeQuery([row], count=8)
    repository = SupabaseReviewInsightRepository(
        FakeClient(query), organization_id
    )

    result = repository.list_reviews({
        "page": 2,
        "page_size": 3,
        "sort_by": "date",
        "sort_order": "desc",
        "product_id": row["product_id"],
        "source": "web_store",
        "sentiment": "negative",
        "rating": 2,
        "topic_id": row["topic_links"][0]["topic_id"],
        "search": "email",
    })

    assert result["total"] == 8
    assert result["page"] == 2
    assert result["page_size"] == 3
    assert result["page_count"] == 3
    assert result["items"][0]["text"] == "raw email: [REDACTED]"
    assert "person@example.com" not in result["items"][0]["text"]
    assert result["items"][0]["sentiment"]["negative"] == 0.8
    assert result["items"][0]["pii_status"]["detected_entities"] == ["email"]
    assert result["items"][0]["processing_status"] == "processed"

    query_calls = repr(query.calls)
    assert str(organization_id) in query_calls
    assert row["product_id"] in query_calls
    assert row["topic_links"][0]["topic_id"] in query_calls
    assert ("range", (3, 5)) in query.calls
    assert ("ilike", ("analysis.sanitized_text", "%email%")) in query.calls
    selected_fields = next(
        call[1][0] for call in query.calls if call[0] == "select"
    )
    assert "review_text" not in selected_fields
    assert "analysis:review_analysis!inner" in selected_fields


def test_unprocessed_review_never_returns_raw_review_text() -> None:
    result = SupabaseReviewInsightRepository._review_to_api({
        "id": "review-id",
        "review_text": "raw personal data",
        "rating": 5,
        "review_date": "2026-10-01T12:00:00+00:00",
        "processing_status": "pending",
        "product": None,
        "source": {"code": "survey"},
        "analysis": None,
        "topic_links": [],
        "complaint_links": [],
    })

    assert result["text"] == ""
    assert result["sentiment"] is None
    assert result["pii_status"] is None


def test_review_repository_clamps_pages_beyond_the_last_page() -> None:
    query = FakeQuery([], count=8)
    repository = SupabaseReviewInsightRepository(
        FakeClient(query), UUID("11111111-1111-4111-8111-111111111111")
    )

    result = repository.list_reviews({"page": 7, "page_size": 3})

    assert result["page"] == 3
    assert [call[1] for call in query.calls if call[0] == "range"] == [
        (18, 20),
        (6, 8),
    ]


def test_review_query_applies_date_and_complaint_filters_before_pagination() -> None:
    query = FakeQuery([], count=0)
    repository = SupabaseReviewInsightRepository(
        FakeClient(query), UUID("11111111-1111-4111-8111-111111111111")
    )

    result = repository.list_reviews({
        "page": 1,
        "page_size": 10,
        "start_at": "2026-10-01T00:00:00+00:00",
        "end_at": "2026-10-08T00:00:00+00:00",
        "complaint_id": "22222222-2222-4222-8222-222222222222",
    })

    assert result["total"] == 0
    assert ("gte", ("review_date", "2026-10-01T00:00:00+00:00")) in query.calls
    assert ("lt", ("review_date", "2026-10-08T00:00:00+00:00")) in query.calls
    assert (
        "eq",
        ("complaint_links.complaint_id", "22222222-2222-4222-8222-222222222222"),
    ) in query.calls
    selected_fields = next(call[1][0] for call in query.calls if call[0] == "select")
    assert "complaint_links:review_complaints!inner" in selected_fields


def test_analytics_rpc_passes_all_tenant_scoped_filters() -> None:
    organization_id = UUID("11111111-1111-4111-8111-111111111111")
    client = FakeClient(FakeQuery({
        "total_reviews": 2,
        "topics": [],
        "complaints": [],
    }))
    repository = SupabaseReviewInsightRepository(client, organization_id)

    result = repository.dashboard_data({
        "start_at": "2026-10-01T00:00:00+00:00",
        "end_at": "2026-10-08T00:00:00+00:00",
        "product_id": "22222222-2222-4222-8222-222222222222",
        "source": "web_store",
        "sentiment": "negative",
        "topic_id": "33333333-3333-4333-8333-333333333333",
        "complaint_id": "44444444-4444-4444-8444-444444444444",
    })

    assert result["total_reviews"] == 2
    name, params = client.rpc_calls[0]
    assert name == "get_dashboard_summary"
    assert params == {
        "p_organization_id": str(organization_id),
        "p_start_at": "2026-10-01T00:00:00+00:00",
        "p_end_at": "2026-10-08T00:00:00+00:00",
        "p_product_id": "22222222-2222-4222-8222-222222222222",
        "p_source": "web_store",
        "p_sentiment": "negative",
        "p_topic_id": "33333333-3333-4333-8333-333333333333",
        "p_complaint_id": "44444444-4444-4444-8444-444444444444",
    }


def test_topic_and_complaint_aggregations_use_database_rpcs_and_filters() -> None:
    organization_id = UUID("11111111-1111-4111-8111-111111111111")
    query = FakeQuery([{"id": "topic-1"}])
    client = FakeClient(query)
    repository = SupabaseReviewInsightRepository(client, organization_id)
    filters = {
        "start_at": "2026-10-01T00:00:00+00:00",
        "end_at": "2026-10-08T00:00:00+00:00",
        "product_id": None,
        "source": "survey",
        "sentiment": "positive",
        "topic_id": None,
        "complaint_id": None,
        "severity": "high",
        "status": "open",
    }

    assert repository.list_topics(filters) == [{"id": "topic-1"}]
    assert repository.list_complaints(filters) == [{"id": "topic-1"}]
    topic_name, topic_args = client.rpc_calls[0]
    complaint_name, complaint_args = client.rpc_calls[1]
    assert topic_name == "get_topic_summaries"
    assert "p_severity" not in topic_args and "p_status" not in topic_args
    assert complaint_name == "get_complaint_summaries"
    assert complaint_args["p_severity"] == "high"
    assert complaint_args["p_status"] == "open"
    assert topic_args["p_sentiment"] == complaint_args["p_sentiment"] == "positive"


def test_insight_storage_uses_server_writer_and_database_selected_evidence() -> None:
    organization_id = UUID("11111111-1111-4111-8111-111111111111")
    user_client = FakeClient(FakeQuery(None))
    writer_client = FakeClient(FakeQuery({
        "id": "insight-id",
        "kind": "sentiment_trend",
        "title": "Sentiment is shifting",
        "summary": "Customers express changing sentiment.",
        "confidence": 0.9,
        "impact": "medium",
        "provider": "gemini",
        "model_name": "gemini-test",
        "model_version": "model-version",
        "generated_at": "2026-10-04T00:00:00+00:00",
        "is_new": True,
        "related_review_ids": [],
    }))
    repository = SupabaseReviewInsightRepository(
        user_client,
        organization_id,
        insight_write_client=writer_client,
    )

    result = repository.create_insight({
        "kind": "sentiment_trend",
        "title": "Sentiment is shifting",
        "summary": "Customers express changing sentiment.",
        "confidence": 0.9,
        "impact": "medium",
        "supporting_metrics": {"analytics": {"total_reviews": 12}},
        "provider": "gemini",
        "model": "gemini-test",
        "model_version": "model-version",
        "related_review_ids": [],
    })

    assert result["provider"] == "gemini"
    assert user_client.rpc_calls == []
    name, params = writer_client.rpc_calls[0]
    assert name == "store_ai_insight"
    assert params["p_organization_id"] == str(organization_id)
    assert params["p_supporting_metrics"] == {
        "analytics": {"total_reviews": 12},
    }


def test_model_health_repository_calls_tenant_scoped_aggregate() -> None:
    organization_id = UUID("11111111-1111-4111-8111-111111111111")
    client = FakeClient(FakeQuery({"reviews_processed": 2}))
    repository = SupabaseReviewInsightRepository(client, organization_id)

    result = repository.model_health_data(45)

    assert result["reviews_processed"] == 2
    assert client.rpc_calls == [(
        "get_admin_model_health",
        {
            "p_organization_id": str(organization_id),
            "p_days": 45,
        },
    )]


def test_user_database_client_uses_only_the_publishable_key(monkeypatch) -> None:
    calls = []

    class FakePostgrest:
        def auth(self, token):
            calls.append(("auth", token))

    client = SimpleNamespace(postgrest=FakePostgrest())

    def fake_create_client(url, key, *, options):
        calls.append(("create", url, key, options.headers))
        return client

    monkeypatch.setattr(supabase_integration, "create_client", fake_create_client)
    result = supabase_integration.create_user_client(
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_anon_key="public-anon-key",
            supabase_service_role_key="server-only-service-key",
        ),
        "user-access-token",
    )

    assert result is client
    assert calls == [
        (
            "create",
            "https://example.supabase.co",
            "public-anon-key",
            {"Authorization": ""},
        ),
        ("auth", "user-access-token"),
    ]


def test_worker_database_client_uses_server_key_only_as_api_key(monkeypatch) -> None:
    calls = []
    client = SimpleNamespace()

    def fake_create_client(url, key, *, options):
        calls.append((url, key, options.headers))
        return client

    monkeypatch.setattr(supabase_integration, "create_client", fake_create_client)
    result = supabase_integration.create_worker_client(
        Settings(
            supabase_url="https://example.supabase.co",
            supabase_anon_key="public-key",
            supabase_service_role_key="server-only-key",
        )
    )

    assert result is client
    assert calls == [
        (
            "https://example.supabase.co",
            "server-only-key",
            {"Authorization": ""},
        )
    ]


def test_organization_context_checks_membership_before_repository_access(monkeypatch) -> None:
    user_id = UUID("11111111-1111-4111-8111-111111111111")
    organization_id = UUID("22222222-2222-4222-8222-222222222222")
    query = FakeQuery({"organization_id": str(organization_id), "role": "admin"})

    class FakeAuth:
        def get_user(self, token):
            assert token == "access-token"
            return SimpleNamespace(user=SimpleNamespace(id=str(user_id)))

    client = SimpleNamespace(
        auth=FakeAuth(),
        table=lambda _table: query,
    )
    monkeypatch.setattr(dependencies, "create_user_client", lambda _settings, _token: client)

    context = dependencies.get_organization_context(
        HTTPAuthorizationCredentials(scheme="Bearer", credentials="access-token"),
        organization_id,
    )

    assert context.user_id == user_id
    assert context.organization_id == organization_id
    assert context.membership_role == "admin"
    assert ("eq", ("organization_id", str(organization_id))) in query.calls
    assert ("eq", ("user_id", str(user_id))) in query.calls

    query.response.data = None
    try:
        dependencies.get_organization_context(
            HTTPAuthorizationCredentials(scheme="Bearer", credentials="access-token"),
            organization_id,
        )
    except HTTPException as exc:
        assert exc.status_code == 403
    else:
        raise AssertionError("An organization without a membership was accepted")
