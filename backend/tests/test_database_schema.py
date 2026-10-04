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
ANALYTICS_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261004002000_real_analytics_catalog.sql"
)
AI_HEALTH_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261004003000_ai_insights_model_health.sql"
)
POWER_BI_MIGRATION = (
    Path(__file__).resolve().parents[2]
    / "supabase"
    / "migrations"
    / "20261004004000_power_bi_analytics.sql"
)
POWER_BI_ROOT = Path(__file__).resolve().parents[2] / "powerbi"


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


def test_analytics_migration_aggregates_with_tenant_and_filter_guards() -> None:
    sql = ANALYTICS_MIGRATION.read_text()
    for function_name in (
        "get_dashboard_summary",
        "get_topic_summaries",
        "get_complaint_summaries",
    ):
        assert f"CREATE FUNCTION public.{function_name}" in sql or (
            f"CREATE OR REPLACE FUNCTION public.{function_name}" in sql
        )

    assert "app_private.is_org_member(p_organization_id)" in sql
    assert "review.organization_id = p_organization_id" in sql
    assert "review.review_date >= p_start_at" in sql
    assert "review.review_date < p_end_at" in sql
    assert "p_product_id IS NULL OR review.product_id = p_product_id" in sql
    assert "p_source IS NULL OR source.code = p_source" in sql
    assert "p_sentiment IS NULL OR analysis.sentiment = p_sentiment" in sql
    assert "p_topic_id IS NULL OR EXISTS" in sql
    assert "p_complaint_id IS NULL OR EXISTS" in sql
    assert "review_volume" in sql
    assert "product_comparison" in sql
    assert "source_comparison" in sql
    assert "affected_products" in sql
    assert "affected_topics" in sql
    assert "'trend', 'stable'" not in sql
    assert "reviews_org_product_date_idx" in sql
    assert "reviews_org_source_date_idx" in sql


def test_ai_health_migration_persists_evidence_and_real_attempt_metrics() -> None:
    sql = AI_HEALTH_MIGRATION.read_text()
    assert "CREATE OR REPLACE FUNCTION public.store_ai_insight" in sql
    assert "auth.role() IS DISTINCT FROM 'service_role'" in sql
    assert "FROM PUBLIC, anon, authenticated" in sql
    assert ") TO service_role" in sql
    assert "supporting_metrics jsonb" in sql
    assert "model_version_id uuid" in sql
    assert "CREATE TRIGGER processing_jobs_capture_analysis_metric" in sql
    assert "NEW.attempts" in sql
    assert "'success', 'failure'" in sql
    assert "processing_latency_avg_ms" in sql
    assert "confidence_distribution" in sql
    assert "confidence_sample_count" in sql
    assert "topic_confidences" in sql
    assert "complaint_confidences" in sql
    assert "sentiment_distribution" in sql
    assert "topic_distribution" in sql
    assert "complaint_distribution" in sql
    assert "app_private.is_org_member(p_organization_id)" in sql
    assert "get_model_health(uuid, integer)" in sql
    assert "sentiment distribution total variation" not in sql
    health_function = sql[
        sql.index("CREATE OR REPLACE FUNCTION public.get_model_health"):
        sql.index("CREATE OR REPLACE FUNCTION public.store_ai_insight")
    ]
    assert "accuracy" not in health_function


def test_power_bi_migration_is_tenant_scoped_and_pii_minimized() -> None:
    sql = POWER_BI_MIGRATION.read_text()
    views = set(re.findall(r"CREATE VIEW reviewband_bi\.([a-z_]+)", sql))
    expected_views = {
        "dim_products", "dim_sources", "dim_topics", "dim_complaints",
        "dim_sentiments", "dim_ratings", "dim_dates", "dim_model_versions",
        "fact_reviews", "fact_review_topics", "fact_review_complaints",
        "fact_model_attempts", "fact_model_confidences", "fact_model_topics",
        "fact_model_complaints", "fact_insights", "bridge_insight_reviews",
    }
    assert views == expected_views
    assert sql.count("WITH (security_invoker = true)") == len(expected_views)
    assert "session_user::text" in sql
    assert "access.login_role = session_user::text" in sql
    assert "CREATE POLICY" in sql
    assert "relation.relrowsecurity" in sql
    assert "NOBYPASSRLS" in sql
    assert "has_column_privilege" in sql
    assert "review.review_text" not in sql
    assert "sanitized_text" not in sql
    assert "detected_pii" not in sql
    assert "has_table_privilege('powerbi_reader', 'public.' || source_table, 'SELECT')" in sql


def test_power_bi_semantic_model_views_and_relationship_columns_match() -> None:
    model_root = POWER_BI_ROOT / "ReviewBand.SemanticModel"
    sql = POWER_BI_MIGRATION.read_text()
    sql_views = set(re.findall(r"CREATE VIEW reviewband_bi\.([a-z_]+)", sql))
    table_files = {
        path.stem: path.read_text()
        for path in (model_root / "tables").glob("*.tmdl")
    }
    assert set(table_files) == sql_views

    for table_name, contents in table_files.items():
        declared_columns = set(re.findall(r"^\s*column ([a-z_]+)\s*$", contents, re.MULTILINE))
        assert "review_text" not in declared_columns
        assert "sanitized_text" not in declared_columns
        assert "detected_pii" not in declared_columns

    relationships = (model_root / "relationships.tmdl").read_text()
    for table_name, column_name in re.findall(
        r"(?:fromColumn|toColumn):\s*([a-z_]+)\.([a-z_]+)", relationships
    ):
        assert table_name in table_files
        declared_columns = set(
            re.findall(
                r"^\s*column ([a-z_]+)\s*$",
                table_files[table_name],
                re.MULTILINE,
            )
        )
        assert column_name in declared_columns, f"Unknown relationship key: {table_name}.{column_name}"

    assert (model_root / "database.tmdl").exists()
    assert (model_root / "model.tmdl").exists()
    assert (model_root / "expressions.tmdl").exists()


def test_power_bi_report_spec_and_measure_library_cover_required_pages() -> None:
    pages = (POWER_BI_ROOT / "ReportPages.md").read_text()
    measures = (POWER_BI_ROOT / "ReviewBand.Measures.dax").read_text()
    for page in (
        "Executive Overview", "Sentiment Analysis", "Topics & Complaints",
        "Product / Campaign Comparison", "Time & Trend Analysis", "Model Health",
    ):
        assert page in pages
    for measure in (
        "Total Reviews", "Average Rating", "Positive %", "Neutral %",
        "Negative %", "Active Complaints", "Review Growth",
        "Sentiment Change", "Complaint Change", "Successful Analyses",
        "Failed Analyses", "Average Processing Latency", "Sentiment Distribution Drift",
    ):
        assert measure in measures
