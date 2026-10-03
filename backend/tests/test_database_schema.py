from pathlib import Path
import re


MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261003230000_initial_reviewband_schema.sql"
)
INGESTION_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261003233000_review_ingestion.sql"
)
ANALYSIS_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261004001000_review_analysis_pipeline.sql"
)


def test_initial_migration_creates_reviewband_domain_tables() -> None:
    sql = MIGRATION.read_text()
    created_tables = set(re.findall(r"CREATE TABLE public\.([a-z_]+)", sql))
    expected = {
        "organizations", "profiles", "memberships", "products", "sources",
        "reviews", "review_analysis", "import_batches", "processing_jobs",
        "topics", "review_topics", "complaints", "review_complaints",
        "ai_insights", "insight_reviews", "model_versions", "model_metrics",
        "reports", "report_runs", "notifications", "audit_logs",
    }
    assert created_tables == expected


def test_migration_defines_tenant_constraints_and_query_indexes() -> None:
    sql = MIGRATION.read_text()
    assert "CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5)" in sql
    assert "ON public.reviews (organization_id, source_id, external_id)" in sql
    assert sql.count("FOREIGN KEY (organization_id,") >= 12

    for index in (
        "reviews_review_date_idx",
        "review_analysis_sentiment_idx",
        "reviews_rating_idx",
        "reviews_product_idx",
        "reviews_source_idx",
        "review_topics_topic_idx",
        "review_complaints_complaint_idx",
        "reviews_org_idx",
    ):
        assert f"CREATE INDEX {index}" in sql

    assert "p_start_at" in sql and "p_end_at" in sql
    assert "review.review_date >= p_start_at" in sql
    assert "review.review_date < p_end_at" in sql


def test_migration_enforces_rls_and_keeps_raw_pii_separate() -> None:
    sql = MIGRATION.read_text()
    assert sql.count("ENABLE ROW LEVEL SECURITY") == 21
    assert "app_private.is_org_member(organization_id)" in sql
    assert "app_private.can_write_org(organization_id)" in sql
    assert "app_private.is_org_admin(organization_id)" in sql
    assert "GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated" in sql
    assert "customer_identifier_hash" in sql
    assert "sanitized_text text" in sql
    assert "detected_pii jsonb" in sql
    assert sql.index("CREATE TABLE public.review_analysis") < sql.index(
        "COMMENT ON COLUMN public.review_analysis.sanitized_text"
    )
    assert "REVOKE ALL ON" in sql and "FROM PUBLIC, anon" in sql
    assert "Migration verification failed: no RLS policies" in sql
    assert "Migration verification failed: missing index" in sql


def test_service_role_key_is_not_exposed_to_vite() -> None:
    repository_root = Path(__file__).resolve().parents[2]
    for path in repository_root.glob("*.env*"):
        assert "VITE_SUPABASE_SERVICE_ROLE_KEY" not in path.read_text()


def test_ingestion_migration_has_atomic_duplicate_and_import_status_guards() -> None:
    sql = INGESTION_MIGRATION.read_text()
    assert "reviews_content_fingerprint_unique" in sql
    assert "ON CONFLICT DO NOTHING" in sql
    assert "CREATE OR REPLACE FUNCTION public.ingest_review" in sql
    assert "INSERT INTO public.review_analysis" in sql
    assert "INSERT INTO public.processing_jobs" in sql
    assert "CREATE TABLE public.import_batch_items" in sql
    assert "accepted_count" in sql
    assert "processing_count" in sql
    assert "import_batch_items_read_member" in sql
    assert "import_batch_items_insert_writer" in sql


def test_analysis_migration_tracks_model_version_status_and_retry_policy() -> None:
    sql = ANALYSIS_MIGRATION.read_text()
    assert "ADD COLUMN provider text" in sql
    assert "ADD COLUMN analysis_status text" in sql
    assert "failure_metadata jsonb" in sql
    assert "claim_review_analysis_job" in sql
    assert "FOR UPDATE OF job SKIP LOCKED" in sql
    assert "complete_review_analysis" in sql
    assert "fail_review_analysis" in sql
    assert "retry_review_analysis" in sql
    assert "retryable" in sql
    assert "interval '5 minutes'" in sql
    assert "REVOKE SELECT ON public.reviews FROM authenticated" in sql
    assert "is selectable by API users" in sql
    assert "auth.role() IS DISTINCT FROM 'service_role'" in sql
    assert "TO service_role" in sql
