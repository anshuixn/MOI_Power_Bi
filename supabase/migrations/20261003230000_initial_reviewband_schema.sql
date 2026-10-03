BEGIN;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE TABLE public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
    slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (id)
);

CREATE TABLE public.profiles (
    id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    display_name text CHECK (display_name IS NULL OR length(display_name) <= 160),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.profiles (id, display_name)
SELECT auth_user.id, NULLIF(auth_user.raw_user_meta_data ->> 'full_name', '')
FROM auth.users AS auth_user
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.memberships (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    role text NOT NULL CHECK (role IN ('owner', 'admin', 'analyst', 'viewer')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, user_id),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.sources (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code text NOT NULL CHECK (code IN ('web_store', 'mobile_app', 'marketplace', 'survey', 'social')),
    display_name text NOT NULL CHECK (length(trim(display_name)) BETWEEN 1 AND 120),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.products (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
    sku text NOT NULL CHECK (length(trim(sku)) BETWEEN 1 AND 100),
    category text NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 120),
    image_url text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, sku),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.model_versions (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    model_name text NOT NULL CHECK (length(trim(model_name)) BETWEEN 1 AND 120),
    version text NOT NULL CHECK (length(trim(version)) BETWEEN 1 AND 80),
    task text NOT NULL CHECK (task IN ('sentiment', 'topic', 'complaint', 'other')),
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'retired', 'testing')),
    parameters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(parameters) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, model_name, version),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 160),
    description text,
    keywords jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(keywords) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, name),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.complaints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    code text NOT NULL CHECK (length(trim(code)) BETWEEN 1 AND 100),
    category text NOT NULL CHECK (length(trim(category)) BETWEEN 1 AND 160),
    description text NOT NULL DEFAULT '',
    severity text NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, code),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.import_batches (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    source_id uuid,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    file_name text NOT NULL CHECK (length(trim(file_name)) BETWEEN 1 AND 255),
    row_count integer NOT NULL DEFAULT 0 CHECK (row_count >= 0),
    error_count integer NOT NULL DEFAULT 0 CHECK (error_count >= 0),
    column_map jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(column_map) = 'object'),
    started_at timestamptz,
    completed_at timestamptz,
    created_by uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, source_id) REFERENCES public.sources(organization_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, created_by) REFERENCES public.memberships(organization_id, user_id) ON DELETE SET NULL (created_by),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    external_id text,
    review_text text NOT NULL CHECK (length(review_text) <= 50000),
    customer_identifier_hash text CHECK (
        customer_identifier_hash IS NULL
        OR customer_identifier_hash ~ '^[0-9a-f]{64}$'
    ),
    rating smallint NOT NULL CONSTRAINT reviews_rating_range CHECK (rating BETWEEN 1 AND 5),
    product_id uuid,
    source_id uuid NOT NULL,
    import_batch_id uuid,
    review_date timestamptz NOT NULL,
    processing_status text NOT NULL DEFAULT 'pending' CHECK (processing_status IN ('pending', 'queued', 'processing', 'processed', 'failed', 'skipped')),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, product_id) REFERENCES public.products(organization_id, id) ON DELETE SET NULL (product_id),
    FOREIGN KEY (organization_id, source_id) REFERENCES public.sources(organization_id, id) ON DELETE RESTRICT,
    FOREIGN KEY (organization_id, import_batch_id) REFERENCES public.import_batches(organization_id, id) ON DELETE SET NULL (import_batch_id),
    UNIQUE (organization_id, id)
);
COMMENT ON COLUMN public.reviews.review_text IS
    'Original review content. Never store author names, emails, phone numbers, or other raw identifiers here.';
COMMENT ON COLUMN public.reviews.customer_identifier_hash IS
    'Optional non-reversible organization-scoped identifier, only when deduplication or customer-level analysis is required. Never store raw PII.';

CREATE UNIQUE INDEX reviews_external_id_unique
    ON public.reviews (organization_id, source_id, external_id)
    WHERE external_id IS NOT NULL;
CREATE INDEX reviews_review_date_idx ON public.reviews (review_date DESC, id DESC);
CREATE INDEX reviews_org_review_date_idx ON public.reviews (organization_id, review_date DESC, id DESC);
CREATE INDEX reviews_rating_idx ON public.reviews (rating);
CREATE INDEX reviews_org_rating_idx ON public.reviews (organization_id, rating);
CREATE INDEX reviews_product_idx ON public.reviews (product_id, review_date DESC);
CREATE INDEX reviews_source_idx ON public.reviews (source_id, review_date DESC);
CREATE INDEX reviews_org_idx ON public.reviews (organization_id, id);
CREATE INDEX reviews_customer_hash_idx
    ON public.reviews (organization_id, customer_identifier_hash)
    WHERE customer_identifier_hash IS NOT NULL;
CREATE INDEX reviews_import_batch_idx ON public.reviews (import_batch_id) WHERE import_batch_id IS NOT NULL;

CREATE TABLE public.review_analysis (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    review_id uuid NOT NULL,
    model_version_id uuid,
    sentiment text CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
    sentiment_score numeric(6, 5) CHECK (sentiment_score IS NULL OR sentiment_score BETWEEN -1 AND 1),
    sentiment_confidence numeric(6, 5) CHECK (sentiment_confidence IS NULL OR sentiment_confidence BETWEEN 0 AND 1),
    sanitized_text text CHECK (sanitized_text IS NULL OR length(sanitized_text) <= 50000),
    detected_pii jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(detected_pii) = 'array'),
    processed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, review_id) REFERENCES public.reviews(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, model_version_id) REFERENCES public.model_versions(organization_id, id) ON DELETE SET NULL (model_version_id),
    UNIQUE (organization_id, review_id),
    UNIQUE (organization_id, id)
);
COMMENT ON COLUMN public.review_analysis.sanitized_text IS
    'PII-redacted text for search and display; raw source remains separately in reviews.review_text.';
COMMENT ON COLUMN public.review_analysis.detected_pii IS
    'Entity type and redacted field metadata only. Do not store matched personal values.';
CREATE INDEX review_analysis_sentiment_idx ON public.review_analysis (sentiment);
CREATE INDEX review_analysis_org_sentiment_idx ON public.review_analysis (organization_id, sentiment);
CREATE INDEX review_analysis_model_idx ON public.review_analysis (model_version_id, processed_at DESC);

CREATE TABLE public.review_topics (
    organization_id uuid NOT NULL,
    review_id uuid NOT NULL,
    topic_id uuid NOT NULL,
    confidence numeric(6, 5) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, review_id, topic_id),
    FOREIGN KEY (organization_id, review_id) REFERENCES public.reviews(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, topic_id) REFERENCES public.topics(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX review_topics_topic_idx ON public.review_topics (topic_id, review_id);
CREATE INDEX review_topics_org_topic_idx ON public.review_topics (organization_id, topic_id, review_id);

CREATE TABLE public.review_complaints (
    organization_id uuid NOT NULL,
    review_id uuid NOT NULL,
    complaint_id uuid NOT NULL,
    confidence numeric(6, 5) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, review_id, complaint_id),
    FOREIGN KEY (organization_id, review_id) REFERENCES public.reviews(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, complaint_id) REFERENCES public.complaints(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX review_complaints_complaint_idx ON public.review_complaints (complaint_id, review_id);
CREATE INDEX review_complaints_org_complaint_idx ON public.review_complaints (organization_id, complaint_id, review_id);

CREATE TABLE public.processing_jobs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    review_id uuid,
    import_batch_id uuid,
    job_type text NOT NULL CHECK (job_type IN ('import', 'analysis', 'reprocess')),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    available_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    error_message text,
    payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, review_id) REFERENCES public.reviews(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, import_batch_id) REFERENCES public.import_batches(organization_id, id) ON DELETE CASCADE,
    CHECK (review_id IS NOT NULL OR import_batch_id IS NOT NULL),
    UNIQUE (organization_id, id)
);
CREATE INDEX processing_jobs_queue_idx ON public.processing_jobs (organization_id, status, available_at) WHERE status IN ('pending', 'failed');

CREATE TABLE public.ai_insights (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    kind text NOT NULL CHECK (kind IN ('trend_detected', 'opportunity', 'alert', 'anomaly', 'summary')),
    title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    summary text NOT NULL,
    confidence numeric(6, 5) NOT NULL CHECK (confidence BETWEEN 0 AND 1),
    impact text NOT NULL CHECK (impact IN ('low', 'medium', 'high', 'critical')),
    topic_id uuid,
    product_id uuid,
    generated_at timestamptz NOT NULL DEFAULT now(),
    is_new boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, topic_id) REFERENCES public.topics(organization_id, id) ON DELETE SET NULL (topic_id),
    FOREIGN KEY (organization_id, product_id) REFERENCES public.products(organization_id, id) ON DELETE SET NULL (product_id),
    UNIQUE (organization_id, id)
);
CREATE INDEX ai_insights_org_generated_idx ON public.ai_insights (organization_id, generated_at DESC, id DESC);

CREATE TABLE public.insight_reviews (
    organization_id uuid NOT NULL,
    insight_id uuid NOT NULL,
    review_id uuid NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (organization_id, insight_id, review_id),
    FOREIGN KEY (organization_id, insight_id) REFERENCES public.ai_insights(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, review_id) REFERENCES public.reviews(organization_id, id) ON DELETE CASCADE
);
CREATE INDEX insight_reviews_review_idx ON public.insight_reviews (review_id, insight_id);

CREATE TABLE public.model_metrics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    model_version_id uuid NOT NULL,
    recorded_at timestamptz NOT NULL DEFAULT now(),
    accuracy numeric(6, 5) CHECK (accuracy IS NULL OR accuracy BETWEEN 0 AND 1),
    precision numeric(6, 5) CHECK (precision IS NULL OR precision BETWEEN 0 AND 1),
    recall numeric(6, 5) CHECK (recall IS NULL OR recall BETWEEN 0 AND 1),
    f1 numeric(6, 5) CHECK (f1 IS NULL OR f1 BETWEEN 0 AND 1),
    macro_f1 numeric(6, 5) CHECK (macro_f1 IS NULL OR macro_f1 BETWEEN 0 AND 1),
    latency_avg_ms integer CHECK (latency_avg_ms IS NULL OR latency_avg_ms >= 0),
    latency_p95_ms integer CHECK (latency_p95_ms IS NULL OR latency_p95_ms >= 0),
    drift numeric(8, 6) CHECK (drift IS NULL OR drift >= 0),
    status text NOT NULL CHECK (status IN ('online', 'degraded', 'offline', 'maintenance')),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, model_version_id) REFERENCES public.model_versions(organization_id, id) ON DELETE CASCADE,
    UNIQUE (organization_id, id)
);
CREATE INDEX model_metrics_org_recorded_idx ON public.model_metrics (organization_id, recorded_at DESC);
CREATE INDEX model_metrics_version_recorded_idx ON public.model_metrics (model_version_id, recorded_at DESC);

CREATE TABLE public.reports (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 200),
    report_type text NOT NULL CHECK (report_type IN ('overview', 'product', 'topic', 'complaint', 'custom')),
    filters jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(filters) = 'object'),
    schedule text CHECK (schedule IS NULL OR schedule IN ('daily', 'weekly', 'monthly')),
    created_by uuid,
    FOREIGN KEY (organization_id, created_by) REFERENCES public.memberships(organization_id, user_id) ON DELETE SET NULL (created_by),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (organization_id, id)
);

CREATE TABLE public.report_runs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    report_id uuid NOT NULL,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
    result jsonb CHECK (result IS NULL OR jsonb_typeof(result) = 'object'),
    output_url text,
    error_message text,
    requested_at timestamptz NOT NULL DEFAULT now(),
    started_at timestamptz,
    completed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, report_id) REFERENCES public.reports(organization_id, id) ON DELETE CASCADE,
    UNIQUE (organization_id, id)
);
CREATE INDEX report_runs_org_requested_idx ON public.report_runs (organization_id, requested_at DESC);

CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient_id uuid NOT NULL,
    kind text NOT NULL CHECK (length(trim(kind)) BETWEEN 1 AND 80),
    title text NOT NULL CHECK (length(trim(title)) BETWEEN 1 AND 240),
    body text NOT NULL DEFAULT '',
    payload jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(payload) = 'object'),
    read_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, recipient_id) REFERENCES public.memberships(organization_id, user_id) ON DELETE CASCADE,
    UNIQUE (organization_id, id)
);
CREATE INDEX notifications_recipient_unread_idx ON public.notifications (organization_id, recipient_id, created_at DESC) WHERE read_at IS NULL;

CREATE TABLE public.audit_logs (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    actor_id uuid,
    action text NOT NULL CHECK (length(trim(action)) BETWEEN 1 AND 120),
    entity_type text NOT NULL CHECK (length(trim(entity_type)) BETWEEN 1 AND 120),
    entity_id uuid,
    before_state jsonb CHECK (before_state IS NULL OR jsonb_typeof(before_state) = 'object'),
    after_state jsonb CHECK (after_state IS NULL OR jsonb_typeof(after_state) = 'object'),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, actor_id) REFERENCES public.memberships(organization_id, user_id) ON DELETE SET NULL (actor_id)
);
CREATE INDEX audit_logs_org_created_idx ON public.audit_logs (organization_id, created_at DESC, id DESC);
CREATE INDEX audit_logs_entity_idx ON public.audit_logs (organization_id, entity_type, entity_id);
COMMENT ON TABLE public.audit_logs IS
    'Store actions and non-sensitive entity state only; never include raw review text or personal data.';

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(
    p_organization_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_product_id uuid DEFAULT NULL,
    p_source text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    result jsonb;
BEGIN
    IF auth.uid() IS NULL OR NOT app_private.is_org_member(p_organization_id) THEN
        RAISE EXCEPTION 'Organization access denied' USING ERRCODE = '42501';
    END IF;
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at < p_start_at THEN
        RAISE EXCEPTION 'Invalid analytics date range' USING ERRCODE = '22023';
    END IF;

    WITH filtered AS (
        SELECT
            review.id,
            review.rating,
            review.review_date,
            source.code AS source_code,
            product.name AS product_name,
            analysis.sentiment
        FROM public.reviews AS review
        JOIN public.sources AS source
          ON source.organization_id = review.organization_id AND source.id = review.source_id
        LEFT JOIN public.products AS product
          ON product.organization_id = review.organization_id AND product.id = review.product_id
        LEFT JOIN public.review_analysis AS analysis
          ON analysis.organization_id = review.organization_id AND analysis.review_id = review.id
        WHERE review.organization_id = p_organization_id
          AND review.review_date >= p_start_at
          AND review.review_date < p_end_at
          AND (p_product_id IS NULL OR review.product_id = p_product_id)
          AND (p_source IS NULL OR source.code = p_source)
    ),
    totals AS (
        SELECT
            count(*)::bigint AS total_reviews,
            coalesce(round(avg(rating)::numeric, 2), 0) AS average_rating,
            count(sentiment)::bigint AS analyzed_reviews,
            count(*) FILTER (WHERE sentiment = 'positive')::bigint AS positive_count,
            count(*) FILTER (WHERE sentiment = 'neutral')::bigint AS neutral_count,
            count(*) FILTER (WHERE sentiment = 'negative')::bigint AS negative_count
        FROM filtered
    ),
    rating_counts AS (
        SELECT jsonb_object_agg(rating::text, count_value) AS json_value
        FROM (
            SELECT rating, count(*)::integer AS count_value
            FROM filtered GROUP BY rating
        ) AS grouped
    ),
    source_counts AS (
        SELECT jsonb_object_agg(source_code, count_value) AS json_value
        FROM (
            SELECT source_code, count(*)::integer AS count_value
            FROM filtered GROUP BY source_code
        ) AS grouped
    ),
    product_counts AS (
        SELECT jsonb_object_agg(product_name, count_value) AS json_value
        FROM (
            SELECT product_name, count(*)::integer AS count_value
            FROM filtered
            WHERE product_name IS NOT NULL
            GROUP BY product_name
        ) AS grouped
    ),
    sentiment_days AS (
        SELECT review_date::date AS day,
               count(*)::integer AS review_count,
               count(*) FILTER (WHERE sentiment = 'positive')::integer AS positive_count,
               count(*) FILTER (WHERE sentiment = 'neutral')::integer AS neutral_count,
               count(*) FILTER (WHERE sentiment = 'negative')::integer AS negative_count
        FROM filtered
        WHERE sentiment IS NOT NULL
        GROUP BY review_date::date
    ),
    trends AS (
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'date', day,
                    'review_count', review_count,
                    'positive', round(100.0 * positive_count / nullif(review_count, 0), 1),
                    'neutral', round(100.0 * neutral_count / nullif(review_count, 0), 1),
                    'negative', round(100.0 * negative_count / nullif(review_count, 0), 1)
                ) ORDER BY day
            ),
            '[]'::jsonb
        ) AS json_value
        FROM sentiment_days
    ),
    topic_rows AS (
        SELECT
            topic.id,
            topic.name,
            topic.keywords,
            count(filtered.id)::integer AS mentions,
            count(filtered.id) FILTER (WHERE filtered.sentiment = 'positive')::integer AS positive_count,
            count(filtered.id) FILTER (WHERE filtered.sentiment = 'neutral')::integer AS neutral_count,
            count(filtered.id) FILTER (WHERE filtered.sentiment = 'negative')::integer AS negative_count,
            count(filtered.id) FILTER (WHERE filtered.sentiment IS NOT NULL)::integer AS analyzed_count,
            (array_agg(filtered.id ORDER BY filtered.review_date DESC))[1:3] AS sample_review_ids
        FROM filtered
        JOIN public.review_topics AS review_topic
          ON review_topic.organization_id = p_organization_id
         AND review_topic.review_id = filtered.id
        JOIN public.topics AS topic
          ON topic.organization_id = p_organization_id
         AND topic.id = review_topic.topic_id
        GROUP BY topic.id, topic.name, topic.keywords
    ),
    topic_values AS (
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'name', name,
                    'mentions', mentions,
                    'positive_pct', coalesce(round(100.0 * positive_count / nullif(analyzed_count, 0), 1), 0),
                    'neutral_pct', coalesce(round(100.0 * neutral_count / nullif(analyzed_count, 0), 1), 0),
                    'negative_pct', coalesce(round(100.0 * negative_count / nullif(analyzed_count, 0), 1), 0),
                    'keywords', keywords,
                    'trend', 'stable',
                    'trend_pct', 0,
                    'sample_review_ids', to_jsonb(sample_review_ids)
                ) ORDER BY mentions DESC
            ),
            '[]'::jsonb
        ) AS json_value
        FROM topic_rows
    ),
    complaint_rows AS (
        SELECT
            complaint.id,
            complaint.category,
            complaint.description,
            complaint.severity,
            complaint.status,
            count(filtered.id)::integer AS active_count,
            (array_agg(filtered.id ORDER BY filtered.review_date DESC))[1:2] AS example_review_ids
        FROM filtered
        JOIN public.review_complaints AS review_complaint
          ON review_complaint.organization_id = p_organization_id
         AND review_complaint.review_id = filtered.id
        JOIN public.complaints AS complaint
          ON complaint.organization_id = p_organization_id
         AND complaint.id = review_complaint.complaint_id
        WHERE complaint.status <> 'resolved'
        GROUP BY complaint.id, complaint.category, complaint.description,
                 complaint.severity, complaint.status
    ),
    complaint_values AS (
        SELECT coalesce(
            jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'category', category,
                    'active_count', active_count,
                    'severity', severity,
                    'trend', 'stable',
                    'trend_pct', 0,
                    'description', description,
                    'example_review_ids', to_jsonb(example_review_ids),
                    'status', status
                ) ORDER BY active_count DESC
            ),
            '[]'::jsonb
        ) AS json_value
        FROM complaint_rows
    ),
    active_complaints AS (
        SELECT count(DISTINCT review.id)::bigint AS value
        FROM filtered AS review
        JOIN public.review_complaints AS review_complaint
          ON review_complaint.organization_id = p_organization_id
         AND review_complaint.review_id = review.id
        JOIN public.complaints AS complaint
          ON complaint.organization_id = p_organization_id
         AND complaint.id = review_complaint.complaint_id
        WHERE complaint.status <> 'resolved'
    )
    SELECT jsonb_build_object(
        'total_reviews', totals.total_reviews,
        'average_rating', totals.average_rating,
        'analyzed_reviews', totals.analyzed_reviews,
        'positive_count', totals.positive_count,
        'neutral_count', totals.neutral_count,
        'negative_count', totals.negative_count,
        'rating_distribution', coalesce(rating_counts.json_value, '{}'::jsonb),
        'source_breakdown', coalesce(source_counts.json_value, '{}'::jsonb),
        'product_breakdown', coalesce(product_counts.json_value, '{}'::jsonb),
        'sentiment_trend', trends.json_value,
        'topics', topic_values.json_value,
        'complaints', complaint_values.json_value,
        'active_complaints', active_complaints.value
    )
    INTO result
    FROM totals, rating_counts, source_counts, product_counts, trends,
         topic_values, complaint_values, active_complaints;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_member(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.organization_id = target_organization_id
          AND membership.user_id = auth.uid()
    );
$$;

CREATE OR REPLACE FUNCTION app_private.can_write_org(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.organization_id = target_organization_id
          AND membership.user_id = auth.uid()
          AND membership.role IN ('owner', 'admin', 'analyst')
    );
$$;

CREATE OR REPLACE FUNCTION app_private.is_org_admin(target_organization_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships AS membership
        WHERE membership.organization_id = target_organization_id
          AND membership.user_id = auth.uid()
          AND membership.role IN ('owner', 'admin')
    );
$$;

CREATE OR REPLACE FUNCTION app_private.shares_org_with(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.memberships AS own_membership
        JOIN public.memberships AS target_membership
          ON target_membership.organization_id = own_membership.organization_id
        WHERE own_membership.user_id = auth.uid()
          AND target_membership.user_id = target_user_id
    );
$$;

CREATE OR REPLACE FUNCTION public.create_organization(org_name text, org_slug text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    new_organization_id uuid;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO new_organization_id;

    INSERT INTO public.memberships (organization_id, user_id, role)
    VALUES (new_organization_id, auth.uid(), 'owner');

    RETURN new_organization_id;
END;
$$;

REVOKE ALL ON FUNCTION app_private.is_org_member(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.can_write_org(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.is_org_admin(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION app_private.shares_org_with(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_dashboard_summary(uuid, timestamptz, timestamptz, uuid, text)
    FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION app_private.is_org_member(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.can_write_org(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.is_org_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.shares_org_with(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(uuid, timestamptz, timestamptz, uuid, text)
    TO authenticated;
REVOKE ALL ON FUNCTION public.create_organization(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_organization(text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO public.profiles (id, display_name)
    VALUES (new.id, NULLIF(new.raw_user_meta_data ->> 'full_name', ''))
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();
REVOKE ALL ON FUNCTION public.handle_new_auth_user() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION app_private.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
    new.updated_at = now();
    RETURN new;
END;
$$;
REVOKE ALL ON FUNCTION app_private.set_updated_at() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.set_updated_at() TO authenticated;

DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'organizations', 'profiles', 'memberships', 'sources', 'products',
        'model_versions', 'topics', 'complaints', 'import_batches', 'reviews',
        'review_analysis', 'processing_jobs', 'ai_insights', 'reports'
    ]
    LOOP
        EXECUTE format(
            'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION app_private.set_updated_at()',
            table_name
        );
    END LOOP;
END;
$$;

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insight_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON
    public.organizations, public.profiles, public.memberships, public.sources,
    public.products, public.model_versions, public.topics, public.complaints,
    public.import_batches, public.reviews, public.review_analysis, public.review_topics,
    public.review_complaints, public.processing_jobs, public.ai_insights,
    public.insight_reviews, public.model_metrics, public.reports, public.report_runs,
    public.notifications, public.audit_logs
FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON
    public.organizations, public.profiles, public.memberships, public.sources,
    public.products, public.model_versions, public.topics, public.complaints,
    public.import_batches, public.reviews, public.review_analysis, public.review_topics,
    public.review_complaints, public.processing_jobs, public.ai_insights,
    public.insight_reviews, public.model_metrics, public.reports, public.report_runs,
    public.notifications, public.audit_logs
TO authenticated;

CREATE POLICY organizations_read_member ON public.organizations
    FOR SELECT TO authenticated USING (app_private.is_org_member(id));
CREATE POLICY organizations_update_admin ON public.organizations
    FOR UPDATE TO authenticated USING (app_private.is_org_admin(id))
    WITH CHECK (app_private.is_org_admin(id));

CREATE POLICY profiles_read_self_or_colleague ON public.profiles
    FOR SELECT TO authenticated USING (id = auth.uid() OR app_private.shares_org_with(id));
CREATE POLICY profiles_update_self ON public.profiles
    FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY memberships_read_member_or_self ON public.memberships
    FOR SELECT TO authenticated
    USING (user_id = auth.uid() OR app_private.is_org_member(organization_id));
CREATE POLICY memberships_insert_admin ON public.memberships
    FOR INSERT TO authenticated WITH CHECK (app_private.is_org_admin(organization_id));
CREATE POLICY memberships_update_admin ON public.memberships
    FOR UPDATE TO authenticated USING (app_private.is_org_admin(organization_id))
    WITH CHECK (app_private.is_org_admin(organization_id));
CREATE POLICY memberships_delete_admin ON public.memberships
    FOR DELETE TO authenticated USING (app_private.is_org_admin(organization_id) AND role <> 'owner');

DO $$
DECLARE
    table_name text;
BEGIN
    FOREACH table_name IN ARRAY ARRAY[
        'sources', 'products', 'model_versions', 'topics', 'complaints',
        'import_batches', 'reviews', 'review_analysis', 'review_topics',
        'review_complaints', 'processing_jobs', 'ai_insights', 'insight_reviews',
        'model_metrics', 'reports', 'report_runs'
    ]
    LOOP
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (app_private.is_org_member(organization_id))',
            table_name || '_read_member', table_name
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (app_private.can_write_org(organization_id))',
            table_name || '_insert_writer', table_name
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (app_private.can_write_org(organization_id)) WITH CHECK (app_private.can_write_org(organization_id))',
            table_name || '_update_writer', table_name
        );
        EXECUTE format(
            'CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (app_private.is_org_admin(organization_id))',
            table_name || '_delete_admin', table_name
        );
    END LOOP;
END;
$$;

CREATE POLICY notifications_recipient_read ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid() AND app_private.is_org_member(organization_id));
CREATE POLICY notifications_recipient_update ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid() AND app_private.is_org_member(organization_id))
    WITH CHECK (recipient_id = auth.uid() AND app_private.is_org_member(organization_id));
CREATE POLICY notifications_insert_admin ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (app_private.is_org_admin(organization_id));

CREATE POLICY audit_logs_read_member ON public.audit_logs
    FOR SELECT TO authenticated USING (app_private.is_org_member(organization_id));
CREATE POLICY audit_logs_insert_actor ON public.audit_logs
    FOR INSERT TO authenticated
    WITH CHECK (actor_id = auth.uid() AND app_private.can_write_org(organization_id));

DO $$
DECLARE
    required_table text;
    required_index text;
BEGIN
    FOREACH required_table IN ARRAY ARRAY[
        'organizations', 'profiles', 'memberships', 'products', 'sources',
        'reviews', 'review_analysis', 'import_batches', 'processing_jobs',
        'topics', 'review_topics', 'complaints', 'review_complaints',
        'ai_insights', 'insight_reviews', 'model_versions', 'model_metrics',
        'reports', 'report_runs', 'notifications', 'audit_logs'
    ]
    LOOP
        IF to_regclass('public.' || required_table) IS NULL THEN
            RAISE EXCEPTION 'Migration verification failed: missing table %', required_table;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_class AS relation
            JOIN pg_namespace AS namespace ON namespace.oid = relation.relnamespace
            WHERE namespace.nspname = 'public'
              AND relation.relname = required_table
              AND relation.relrowsecurity
        ) THEN
            RAISE EXCEPTION 'Migration verification failed: RLS not enabled on %', required_table;
        END IF;
        IF NOT EXISTS (
            SELECT 1 FROM pg_policy
            WHERE polrelid = to_regclass('public.' || required_table)
        ) THEN
            RAISE EXCEPTION 'Migration verification failed: no RLS policies on %', required_table;
        END IF;
    END LOOP;

    FOREACH required_index IN ARRAY ARRAY[
        'reviews_review_date_idx', 'review_analysis_sentiment_idx',
        'reviews_rating_idx', 'reviews_product_idx', 'reviews_source_idx',
        'review_topics_topic_idx', 'review_complaints_complaint_idx',
        'reviews_org_idx'
    ]
    LOOP
        IF to_regclass('public.' || required_index) IS NULL THEN
            RAISE EXCEPTION 'Migration verification failed: missing index %', required_index;
        END IF;
    END LOOP;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.reviews'::regclass AND contype = 'f'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.reviews'::regclass AND contype = 'c'
          AND conname = 'reviews_rating_range'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policy
        WHERE polrelid = 'public.reviews'::regclass AND polname = 'reviews_read_member'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: review relationships, constraints, or tenant policies missing';
    END IF;

    IF (
        SELECT count(*) FROM pg_constraint
        WHERE contype = 'f'
          AND connamespace = 'public'::regnamespace
          AND cardinality(conkey) >= 2
    ) < 20 THEN
        RAISE EXCEPTION 'Migration verification failed: tenant-scoped composite relationships are missing';
    END IF;
END;
$$;

COMMIT;
