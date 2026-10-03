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

    def table(self, _table):
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


def test_user_database_client_uses_only_the_anon_key(monkeypatch) -> None:
    calls = []

    class FakePostgrest:
        def auth(self, token):
            calls.append(("auth", token))

    client = SimpleNamespace(postgrest=FakePostgrest())

    def fake_create_client(url, key):
        calls.append(("create", url, key))
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
        ("create", "https://example.supabase.co", "public-anon-key"),
        ("auth", "user-access-token"),
    ]


def test_organization_context_checks_membership_before_repository_access(monkeypatch) -> None:
    user_id = UUID("11111111-1111-4111-8111-111111111111")
    organization_id = UUID("22222222-2222-4222-8222-222222222222")
    query = FakeQuery({"organization_id": str(organization_id)})

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
