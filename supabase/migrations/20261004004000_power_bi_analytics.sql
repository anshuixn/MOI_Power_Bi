BEGIN;

CREATE ROLE powerbi_reader NOLOGIN INHERIT NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO powerbi_reader;
GRANT USAGE ON SCHEMA app_private TO powerbi_reader;

CREATE TABLE app_private.powerbi_organization_access (
    login_role text PRIMARY KEY
        CHECK (login_role ~ '^[a-zA-Z_][a-zA-Z0-9_$.-]{0,62}$'),
    organization_id uuid NOT NULL
        REFERENCES public.organizations(id) ON DELETE CASCADE,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (login_role, organization_id)
);
REVOKE ALL ON app_private.powerbi_organization_access FROM PUBLIC, anon, authenticated, powerbi_reader;

CREATE OR REPLACE FUNCTION app_private.powerbi_organization_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT access.organization_id
    FROM app_private.powerbi_organization_access AS access
    WHERE access.login_role = session_user::text
    LIMIT 1;
$$;
REVOKE ALL ON FUNCTION app_private.powerbi_organization_id() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.powerbi_organization_id() TO powerbi_reader;

DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'products', 'sources', 'reviews', 'review_analysis',
        'review_topics', 'review_complaints', 'topics', 'complaints',
        'model_versions', 'model_metrics', 'ai_insights', 'insight_reviews'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO powerbi_reader USING (organization_id = app_private.powerbi_organization_id())',
            table_name || '_read_powerbi_org', table_name
        );
    END LOOP;
END;
$$;

CREATE SCHEMA reviewband_bi;
REVOKE ALL ON SCHEMA reviewband_bi FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA reviewband_bi TO powerbi_reader;

CREATE VIEW reviewband_bi.dim_products
WITH (security_invoker = true)
AS
SELECT product.organization_id, product.id AS product_id,
       product.name AS product_name, product.sku, product.category
FROM public.products AS product
WHERE product.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.dim_sources
WITH (security_invoker = true)
AS
SELECT source.organization_id, source.id AS source_id,
       source.code AS source_code, source.display_name AS source_name
FROM public.sources AS source
WHERE source.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.dim_topics
WITH (security_invoker = true)
AS
SELECT topic.organization_id, topic.id AS topic_id,
       topic.name AS topic_name, topic.description
FROM public.topics AS topic
WHERE topic.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.dim_complaints
WITH (security_invoker = true)
AS
SELECT complaint.organization_id, complaint.id AS complaint_id,
       complaint.code AS complaint_code, complaint.category AS complaint_category,
       complaint.severity, complaint.status, complaint.description
FROM public.complaints AS complaint
WHERE complaint.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.dim_sentiments
WITH (security_invoker = true)
AS
SELECT sentiment
FROM (VALUES ('positive'), ('neutral'), ('negative'), ('unanalyzed')) AS valueset(sentiment);

CREATE VIEW reviewband_bi.dim_ratings
WITH (security_invoker = true)
AS
SELECT rating FROM generate_series(1, 5) AS valueset(rating);

CREATE VIEW reviewband_bi.dim_dates
WITH (security_invoker = true)
AS
WITH organization_dates AS (
    SELECT
        min(event_date)::date AS first_date,
        max(event_date)::date AS last_date
    FROM (
        SELECT review.review_date AT TIME ZONE 'UTC' AS event_date
        FROM public.reviews AS review
        WHERE review.organization_id = app_private.powerbi_organization_id()
        UNION ALL
        SELECT metric.recorded_at AT TIME ZONE 'UTC'
        FROM public.model_metrics AS metric
        WHERE metric.organization_id = app_private.powerbi_organization_id()
        UNION ALL
        SELECT insight.generated_at AT TIME ZONE 'UTC'
        FROM public.ai_insights AS insight
        WHERE insight.organization_id = app_private.powerbi_organization_id()
    ) AS events
)
SELECT
    calendar.day::date AS date_key,
    extract(year FROM calendar.day)::integer AS year,
    extract(quarter FROM calendar.day)::integer AS quarter_number,
    'Q' || extract(quarter FROM calendar.day)::integer::text AS quarter,
    extract(month FROM calendar.day)::integer AS month_number,
    to_char(calendar.day, 'Mon') AS month_name,
    to_char(calendar.day, 'YYYY-MM') AS year_month,
    calendar.day::date - (extract(isodow FROM calendar.day)::integer - 1) AS week_start,
    extract(week FROM calendar.day)::integer AS week_number,
    extract(day FROM calendar.day)::integer AS day_of_month,
    to_char(calendar.day, 'Dy') AS day_name,
    extract(isodow FROM calendar.day)::integer IN (6, 7) AS is_weekend
FROM organization_dates AS bounds
CROSS JOIN LATERAL generate_series(
    bounds.first_date::timestamp,
    bounds.last_date::timestamp,
    interval '1 day'
) AS calendar(day)
WHERE bounds.first_date IS NOT NULL;

CREATE VIEW reviewband_bi.dim_model_versions
WITH (security_invoker = true)
AS
SELECT version.organization_id, version.id AS model_version_id,
       version.provider, version.model_name, version.version AS model_version,
       version.task, version.status AS model_status, version.created_at
FROM public.model_versions AS version
WHERE version.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.fact_reviews
WITH (security_invoker = true)
AS
SELECT
    review.organization_id,
    review.id AS review_id,
    (review.review_date AT TIME ZONE 'UTC')::date AS date_key,
    review.review_date,
    review.product_id,
    review.source_id,
    review.rating,
    coalesce(analysis.sentiment, 'unanalyzed') AS sentiment,
    analysis.sentiment_score,
    analysis.sentiment_confidence,
    review.processing_status,
    analysis.analysis_status,
    analysis.processed_at
FROM public.reviews AS review
LEFT JOIN public.review_analysis AS analysis
  ON analysis.organization_id = review.organization_id
 AND analysis.review_id = review.id
WHERE review.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.fact_review_topics
WITH (security_invoker = true)
AS
SELECT
    link.organization_id,
    link.review_id,
    link.topic_id,
    (review.review_date AT TIME ZONE 'UTC')::date AS date_key,
    review.product_id,
    review.source_id,
    review.rating,
    coalesce(analysis.sentiment, 'unanalyzed') AS sentiment,
    link.confidence AS topic_confidence
FROM public.review_topics AS link
JOIN public.reviews AS review
  ON review.organization_id = link.organization_id
 AND review.id = link.review_id
LEFT JOIN public.review_analysis AS analysis
  ON analysis.organization_id = review.organization_id
 AND analysis.review_id = review.id
WHERE link.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.fact_review_complaints
WITH (security_invoker = true)
AS
SELECT
    link.organization_id,
    link.review_id,
    link.complaint_id,
    (review.review_date AT TIME ZONE 'UTC')::date AS date_key,
    review.product_id,
    review.source_id,
    review.rating,
    coalesce(analysis.sentiment, 'unanalyzed') AS sentiment,
    complaint.severity,
    complaint.status AS complaint_status,
    link.confidence AS complaint_confidence
FROM public.review_complaints AS link
JOIN public.reviews AS review
  ON review.organization_id = link.organization_id
 AND review.id = link.review_id
JOIN public.complaints AS complaint
  ON complaint.organization_id = link.organization_id
 AND complaint.id = link.complaint_id
LEFT JOIN public.review_analysis AS analysis
  ON analysis.organization_id = review.organization_id
 AND analysis.review_id = review.id
WHERE link.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.fact_model_attempts
WITH (security_invoker = true)
AS
SELECT
    metric.organization_id,
    metric.id AS model_metric_id,
    metric.review_id,
    (metric.recorded_at AT TIME ZONE 'UTC')::date AS date_key,
    metric.recorded_at,
    metric.model_version_id,
    review.product_id,
    review.source_id,
    metric.attempt,
    metric.outcome,
    metric.latency_ms,
    metric.confidence AS sentiment_confidence,
    metric.sentiment,
    metric.error_code,
    metric.status AS model_status
FROM public.model_metrics AS metric
LEFT JOIN public.reviews AS review
  ON review.organization_id = metric.organization_id
 AND review.id = metric.review_id
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.review_id IS NOT NULL
  AND metric.outcome IS NOT NULL;

CREATE VIEW reviewband_bi.fact_model_confidences
WITH (security_invoker = true)
AS
SELECT metric.organization_id, metric.id AS model_metric_id,
       metric.review_id, (metric.recorded_at AT TIME ZONE 'UTC')::date AS date_key,
       metric.model_version_id, 'sentiment'::text AS classification_type,
       NULL::uuid AS classification_id, metric.confidence
FROM public.model_metrics AS metric
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.outcome = 'success' AND metric.confidence IS NOT NULL
UNION ALL
SELECT metric.organization_id, metric.id, metric.review_id,
       (metric.recorded_at AT TIME ZONE 'UTC')::date, metric.model_version_id,
       'topic'::text, topic_ref.id, topic_ref.confidence
FROM public.model_metrics AS metric
CROSS JOIN LATERAL unnest(metric.topic_ids, metric.topic_confidences)
    AS topic_ref(id, confidence)
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.outcome = 'success'
UNION ALL
SELECT metric.organization_id, metric.id, metric.review_id,
       (metric.recorded_at AT TIME ZONE 'UTC')::date, metric.model_version_id,
       'complaint'::text, complaint_ref.id, complaint_ref.confidence
FROM public.model_metrics AS metric
CROSS JOIN LATERAL unnest(metric.complaint_ids, metric.complaint_confidences)
    AS complaint_ref(id, confidence)
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.outcome = 'success';

CREATE VIEW reviewband_bi.fact_model_topics
WITH (security_invoker = true)
AS
SELECT metric.organization_id, metric.id AS model_metric_id,
       metric.review_id, (metric.recorded_at AT TIME ZONE 'UTC')::date AS date_key,
       metric.model_version_id, topic_ref.topic_id
FROM public.model_metrics AS metric
CROSS JOIN LATERAL unnest(metric.topic_ids) AS topic_ref(topic_id)
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.outcome = 'success';

CREATE VIEW reviewband_bi.fact_model_complaints
WITH (security_invoker = true)
AS
SELECT metric.organization_id, metric.id AS model_metric_id,
       metric.review_id, (metric.recorded_at AT TIME ZONE 'UTC')::date AS date_key,
       metric.model_version_id, complaint_ref.complaint_id
FROM public.model_metrics AS metric
CROSS JOIN LATERAL unnest(metric.complaint_ids) AS complaint_ref(complaint_id)
WHERE metric.organization_id = app_private.powerbi_organization_id()
  AND metric.outcome = 'success';

CREATE VIEW reviewband_bi.fact_insights
WITH (security_invoker = true)
AS
SELECT
    insight.organization_id,
    insight.id AS insight_id,
    (insight.generated_at AT TIME ZONE 'UTC')::date AS date_key,
    insight.generated_at,
    insight.kind AS insight_type,
    insight.title,
    insight.summary,
    insight.confidence,
    insight.impact,
    insight.topic_id,
    insight.product_id,
    insight.complaint_id,
    insight.provider,
    insight.model_name,
    insight.model_version,
    insight.supporting_metrics::text AS supporting_metrics_json
FROM public.ai_insights AS insight
WHERE insight.organization_id = app_private.powerbi_organization_id();

CREATE VIEW reviewband_bi.bridge_insight_reviews
WITH (security_invoker = true)
AS
SELECT link.organization_id, link.insight_id, link.review_id
FROM public.insight_reviews AS link
WHERE link.organization_id = app_private.powerbi_organization_id();

GRANT SELECT (organization_id, id, name, sku, category)
    ON public.products TO powerbi_reader;
GRANT SELECT (organization_id, id, code, display_name)
    ON public.sources TO powerbi_reader;
GRANT SELECT (organization_id, id, review_date, product_id, source_id, rating, processing_status)
    ON public.reviews TO powerbi_reader;
GRANT SELECT (organization_id, review_id, sentiment, sentiment_score,
              sentiment_confidence, analysis_status, processed_at)
    ON public.review_analysis TO powerbi_reader;
GRANT SELECT (organization_id, review_id, topic_id, confidence)
    ON public.review_topics TO powerbi_reader;
GRANT SELECT (organization_id, review_id, complaint_id, confidence)
    ON public.review_complaints TO powerbi_reader;
GRANT SELECT (organization_id, id, name, description)
    ON public.topics TO powerbi_reader;
GRANT SELECT (organization_id, id, code, category, severity, status, description)
    ON public.complaints TO powerbi_reader;
GRANT SELECT (organization_id, id, provider, model_name, version, task, status, created_at)
    ON public.model_versions TO powerbi_reader;
GRANT SELECT (organization_id, id, review_id, recorded_at, model_version_id,
              attempt, outcome, latency_ms, confidence, sentiment, topic_ids,
              topic_confidences, complaint_ids, complaint_confidences, error_code, status)
    ON public.model_metrics TO powerbi_reader;
GRANT SELECT (organization_id, id, generated_at, kind, title, summary, confidence,
              impact, topic_id, product_id, complaint_id, provider, model_name,
              model_version, supporting_metrics)
    ON public.ai_insights TO powerbi_reader;
GRANT SELECT (organization_id, insight_id, review_id)
    ON public.insight_reviews TO powerbi_reader;

GRANT SELECT ON
    reviewband_bi.dim_products,
    reviewband_bi.dim_sources,
    reviewband_bi.dim_topics,
    reviewband_bi.dim_complaints,
    reviewband_bi.dim_sentiments,
    reviewband_bi.dim_ratings,
    reviewband_bi.dim_dates,
    reviewband_bi.dim_model_versions,
    reviewband_bi.fact_reviews,
    reviewband_bi.fact_review_topics,
    reviewband_bi.fact_review_complaints,
    reviewband_bi.fact_model_attempts,
    reviewband_bi.fact_model_confidences,
    reviewband_bi.fact_model_topics,
    reviewband_bi.fact_model_complaints,
    reviewband_bi.fact_insights,
    reviewband_bi.bridge_insight_reviews
TO powerbi_reader;

DO $$
DECLARE
    source_table text;
    reporting_view text;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_roles
        WHERE rolname = 'powerbi_reader' AND NOT rolcanlogin AND NOT rolbypassrls
    ) THEN
        RAISE EXCEPTION 'Power BI reader role must be a non-login role without RLS bypass';
    END IF;
    FOREACH source_table IN ARRAY ARRAY[
        'products', 'sources', 'reviews', 'review_analysis',
        'review_topics', 'review_complaints', 'topics', 'complaints',
        'model_versions', 'model_metrics', 'ai_insights', 'insight_reviews'
    ]
    LOOP
        IF has_table_privilege('powerbi_reader', 'public.' || source_table, 'SELECT') THEN
            RAISE EXCEPTION 'Power BI reader has broad SELECT on public.%', source_table;
        END IF;
        IF NOT EXISTS (
            SELECT 1
            FROM pg_class AS relation
            JOIN pg_namespace AS schema ON schema.oid = relation.relnamespace
            JOIN pg_policy AS policy ON policy.polrelid = relation.oid
            WHERE schema.nspname = 'public'
              AND relation.relname = source_table
              AND relation.relrowsecurity
              AND policy.polname = source_table || '_read_powerbi_org'
        ) THEN
            RAISE EXCEPTION 'Missing tenant RLS/policy for public.%', source_table;
        END IF;
    END LOOP;

    IF has_column_privilege(
        'powerbi_reader', 'public.reviews', 'review_text', 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Power BI reader must not access raw review text';
    END IF;

    FOREACH reporting_view IN ARRAY ARRAY[
        'dim_products', 'dim_sources', 'dim_topics', 'dim_complaints',
        'dim_sentiments', 'dim_ratings', 'dim_dates', 'dim_model_versions',
        'fact_reviews', 'fact_review_topics', 'fact_review_complaints',
        'fact_model_attempts', 'fact_model_confidences', 'fact_model_topics',
        'fact_model_complaints', 'fact_insights', 'bridge_insight_reviews'
    ]
    LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_class AS relation
            WHERE relation.oid = to_regclass('reviewband_bi.' || reporting_view)
              AND relation.relkind = 'v'
              AND relation.reloptions @> ARRAY['security_invoker=true']
        ) THEN
            RAISE EXCEPTION 'Missing or unsafe Power BI view: %', reporting_view;
        END IF;
    END LOOP;
END;
$$;

COMMIT;
