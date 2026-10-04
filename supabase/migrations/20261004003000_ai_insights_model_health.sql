BEGIN;

ALTER TABLE public.ai_insights
    DROP CONSTRAINT ai_insights_kind_check,
    ADD CONSTRAINT ai_insights_kind_check CHECK (
        kind IN (
            'trend_detected', 'opportunity', 'alert', 'anomaly', 'summary',
            'sentiment_trend', 'emerging_complaint', 'product_issue',
            'topic_movement', 'rating_change', 'unusual_trend'
        )
    ),
    ADD COLUMN complaint_id uuid,
    ADD COLUMN supporting_metrics jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(supporting_metrics) = 'object'),
    ADD COLUMN model_name text NOT NULL DEFAULT 'unknown'
        CHECK (length(trim(model_name)) BETWEEN 1 AND 120),
    ADD COLUMN model_version text NOT NULL DEFAULT 'unknown'
        CHECK (length(trim(model_version)) BETWEEN 1 AND 80),
    ADD COLUMN model_version_id uuid,
    ADD COLUMN provider text NOT NULL DEFAULT 'unknown'
        CHECK (length(trim(provider)) BETWEEN 1 AND 80),
    ADD CONSTRAINT ai_insights_org_complaint_fk
        FOREIGN KEY (organization_id, complaint_id)
        REFERENCES public.complaints(organization_id, id)
        ON DELETE SET NULL (complaint_id),
    ADD CONSTRAINT ai_insights_org_model_version_fk
        FOREIGN KEY (organization_id, model_version_id)
        REFERENCES public.model_versions(organization_id, id)
        ON DELETE SET NULL (model_version_id);

CREATE INDEX ai_insights_org_kind_generated_idx
    ON public.ai_insights (organization_id, kind, generated_at DESC);
CREATE INDEX ai_insights_org_topic_generated_idx
    ON public.ai_insights (organization_id, topic_id, generated_at DESC)
    WHERE topic_id IS NOT NULL;
CREATE INDEX ai_insights_org_product_generated_idx
    ON public.ai_insights (organization_id, product_id, generated_at DESC)
    WHERE product_id IS NOT NULL;
CREATE INDEX ai_insights_org_complaint_generated_idx
    ON public.ai_insights (organization_id, complaint_id, generated_at DESC)
    WHERE complaint_id IS NOT NULL;

ALTER TABLE public.model_metrics
    ADD COLUMN review_id uuid,
    ADD COLUMN attempt integer CHECK (attempt IS NULL OR attempt > 0),
    ADD COLUMN outcome text CHECK (outcome IS NULL OR outcome IN ('success', 'failure')),
    ADD COLUMN latency_ms integer CHECK (latency_ms IS NULL OR latency_ms >= 0),
    ADD COLUMN confidence numeric(6, 5)
        CHECK (confidence IS NULL OR confidence BETWEEN 0 AND 1),
    ADD COLUMN sentiment text
        CHECK (sentiment IS NULL OR sentiment IN ('positive', 'neutral', 'negative')),
    ADD COLUMN topic_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    ADD COLUMN topic_confidences numeric[] NOT NULL DEFAULT ARRAY[]::numeric[],
    ADD COLUMN complaint_ids uuid[] NOT NULL DEFAULT ARRAY[]::uuid[],
    ADD COLUMN complaint_confidences numeric[] NOT NULL DEFAULT ARRAY[]::numeric[],
    ADD COLUMN error_code text,
    ADD CONSTRAINT model_metrics_topic_confidence_alignment
        CHECK (cardinality(topic_ids) = cardinality(topic_confidences)),
    ADD CONSTRAINT model_metrics_complaint_confidence_alignment
        CHECK (cardinality(complaint_ids) = cardinality(complaint_confidences)),
    ADD CONSTRAINT model_metrics_org_review_fk
        FOREIGN KEY (organization_id, review_id)
        REFERENCES public.reviews(organization_id, id)
        ON DELETE CASCADE;

CREATE UNIQUE INDEX model_metrics_org_review_attempt_unique
    ON public.model_metrics (organization_id, review_id, attempt)
    WHERE review_id IS NOT NULL AND attempt IS NOT NULL;
CREATE INDEX model_metrics_org_outcome_recorded_idx
    ON public.model_metrics (organization_id, outcome, recorded_at DESC);
CREATE INDEX model_metrics_org_version_recorded_idx
    ON public.model_metrics (organization_id, model_version_id, recorded_at DESC);
REVOKE INSERT, UPDATE, DELETE ON public.model_metrics FROM authenticated;

CREATE OR REPLACE FUNCTION app_private.capture_analysis_attempt_metric()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    analysis record;
    captured_topic_ids uuid[];
    captured_topic_confidences numeric[];
    captured_complaint_ids uuid[];
    captured_complaint_confidences numeric[];
BEGIN
    IF OLD.job_type <> 'analysis'
       OR OLD.status <> 'running'
       OR NEW.status NOT IN ('completed', 'pending', 'failed')
       OR OLD.review_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT model_version_id, sentiment_confidence, sentiment
    INTO analysis
    FROM public.review_analysis
    WHERE organization_id = NEW.organization_id
      AND review_id = NEW.review_id;

    IF analysis.model_version_id IS NULL THEN
        RETURN NEW;
    END IF;

    SELECT
        coalesce(array_agg(topic_id ORDER BY topic_id), ARRAY[]::uuid[]),
        coalesce(array_agg(confidence ORDER BY topic_id), ARRAY[]::numeric[])
    INTO captured_topic_ids, captured_topic_confidences
    FROM public.review_topics
    WHERE organization_id = NEW.organization_id
      AND review_id = NEW.review_id;

    SELECT
        coalesce(array_agg(complaint_id ORDER BY complaint_id), ARRAY[]::uuid[]),
        coalesce(array_agg(confidence ORDER BY complaint_id), ARRAY[]::numeric[])
    INTO captured_complaint_ids, captured_complaint_confidences
    FROM public.review_complaints
    WHERE organization_id = NEW.organization_id
      AND review_id = NEW.review_id;

    INSERT INTO public.model_metrics (
        organization_id,
        model_version_id,
        review_id,
        attempt,
        recorded_at,
        outcome,
        latency_ms,
        confidence,
        sentiment,
        topic_ids,
        topic_confidences,
        complaint_ids,
        complaint_confidences,
        error_code,
        status
    )
    VALUES (
        NEW.organization_id,
        analysis.model_version_id,
        NEW.review_id,
        NEW.attempts,
        coalesce(NEW.completed_at, now()),
        CASE WHEN NEW.status = 'completed' THEN 'success' ELSE 'failure' END,
        greatest(
            0,
            floor(extract(epoch FROM (coalesce(NEW.completed_at, now()) - OLD.started_at)) * 1000)
        )::integer,
        CASE WHEN NEW.status = 'completed' THEN analysis.sentiment_confidence END,
        CASE WHEN NEW.status = 'completed' THEN analysis.sentiment END,
        CASE WHEN NEW.status = 'completed' THEN captured_topic_ids ELSE ARRAY[]::uuid[] END,
        CASE WHEN NEW.status = 'completed'
            THEN captured_topic_confidences ELSE ARRAY[]::numeric[] END,
        CASE WHEN NEW.status = 'completed' THEN captured_complaint_ids ELSE ARRAY[]::uuid[] END,
        CASE WHEN NEW.status = 'completed'
            THEN captured_complaint_confidences ELSE ARRAY[]::numeric[] END,
        CASE WHEN NEW.status = 'completed' THEN NULL ELSE NEW.error_message END,
        CASE WHEN NEW.status = 'completed' THEN 'online' ELSE 'degraded' END
    )
    ON CONFLICT (organization_id, review_id, attempt)
        WHERE review_id IS NOT NULL AND attempt IS NOT NULL
    DO NOTHING;
    RETURN NEW;
END;
$$;

CREATE TRIGGER processing_jobs_capture_analysis_metric
    AFTER UPDATE ON public.processing_jobs
    FOR EACH ROW
    EXECUTE FUNCTION app_private.capture_analysis_attempt_metric();

CREATE OR REPLACE FUNCTION public.get_model_health(
    p_organization_id uuid,
    p_days integer DEFAULT 30
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
    IF p_days IS NULL OR p_days < 1 OR p_days > 365 THEN
        RAISE EXCEPTION 'Invalid model health window' USING ERRCODE = '22023';
    END IF;

    WITH bounds AS (
        SELECT now() - make_interval(days => p_days) AS current_start,
               now() - make_interval(days => p_days * 2) AS previous_start
    ),
    recent AS MATERIALIZED (
        SELECT metric.*
        FROM public.model_metrics AS metric
        CROSS JOIN bounds
        WHERE metric.organization_id = p_organization_id
          AND metric.review_id IS NOT NULL
          AND metric.recorded_at >= bounds.current_start
          AND metric.recorded_at < now()
    ),
    previous AS MATERIALIZED (
        SELECT metric.*
        FROM public.model_metrics AS metric
        CROSS JOIN bounds
        WHERE metric.organization_id = p_organization_id
          AND metric.review_id IS NOT NULL
          AND metric.recorded_at >= bounds.previous_start
          AND metric.recorded_at < bounds.current_start
    ),
    current_summary AS (
        SELECT
            count(DISTINCT review_id)::integer AS reviews_processed,
            count(*) FILTER (WHERE outcome = 'success')::integer AS successful_analyses,
            count(*) FILTER (WHERE outcome = 'failure')::integer AS failed_analyses,
            count(latency_ms)::integer AS latency_sample_count,
            round(avg(latency_ms), 2) AS latency_avg_ms,
            round(percentile_cont(0.95) WITHIN GROUP (ORDER BY latency_ms)::numeric, 2)
                AS latency_p95_ms,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'positive')::integer
                AS sentiment_positive,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'neutral')::integer
                AS sentiment_neutral,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'negative')::integer
                AS sentiment_negative
        FROM recent
    ),
    previous_summary AS (
        SELECT
            count(*) FILTER (WHERE outcome = 'success')::integer AS successful_analyses,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'positive')::integer
                AS sentiment_positive,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'neutral')::integer
                AS sentiment_neutral,
            count(*) FILTER (WHERE outcome = 'success' AND sentiment = 'negative')::integer
                AS sentiment_negative
        FROM previous
    ),
    confidence_values AS MATERIALIZED (
        SELECT metric.confidence AS value
        FROM recent AS metric
        WHERE metric.outcome = 'success' AND metric.confidence IS NOT NULL
        UNION ALL
        SELECT confidence.value
        FROM recent AS metric
        CROSS JOIN LATERAL unnest(metric.topic_confidences) AS confidence(value)
        WHERE metric.outcome = 'success'
        UNION ALL
        SELECT confidence.value
        FROM recent AS metric
        CROSS JOIN LATERAL unnest(metric.complaint_confidences) AS confidence(value)
        WHERE metric.outcome = 'success'
    ),
    confidence_summary AS (
        SELECT
            count(*)::integer AS sample_count,
            count(*) FILTER (WHERE value < 0.5)::integer AS low,
            count(*) FILTER (WHERE value >= 0.5 AND value < 0.8)::integer AS medium,
            count(*) FILTER (WHERE value >= 0.8)::integer AS high
        FROM confidence_values
    ),
    current_topics AS (
        SELECT topic.id, topic.name, count(*)::integer AS mentions
        FROM recent AS metric
        CROSS JOIN LATERAL unnest(metric.topic_ids) AS topic_ref(id)
        JOIN public.topics AS topic
          ON topic.organization_id = metric.organization_id
         AND topic.id = topic_ref.id
        WHERE metric.outcome = 'success'
        GROUP BY topic.id, topic.name
    ),
    current_complaints AS (
        SELECT complaint.id, complaint.category, count(*)::integer AS mentions
        FROM recent AS metric
        CROSS JOIN LATERAL unnest(metric.complaint_ids) AS complaint_ref(id)
        JOIN public.complaints AS complaint
          ON complaint.organization_id = metric.organization_id
         AND complaint.id = complaint_ref.id
        WHERE metric.outcome = 'success'
        GROUP BY complaint.id, complaint.category
    ),
    current_versions AS (
        SELECT
            version.id,
            version.provider,
            version.model_name,
            version.version,
            max(metric.recorded_at) AS last_used_at,
            count(*) FILTER (WHERE metric.outcome = 'success')::integer AS successful_analyses,
            count(*) FILTER (WHERE metric.outcome = 'failure')::integer AS failed_analyses
        FROM recent AS metric
        JOIN public.model_versions AS version
          ON version.organization_id = metric.organization_id
         AND version.id = metric.model_version_id
        GROUP BY version.id, version.provider, version.model_name, version.version
    )
    SELECT jsonb_build_object(
        'reviews_processed', current_summary.reviews_processed,
        'successful_analyses', current_summary.successful_analyses,
        'failed_analyses', current_summary.failed_analyses,
        'latency_sample_count', current_summary.latency_sample_count,
        'processing_latency_avg_ms', current_summary.latency_avg_ms,
        'processing_latency_p95_ms', current_summary.latency_p95_ms,
        'queue_depth', (
            SELECT count(*)::integer
            FROM public.processing_jobs AS job
            WHERE job.organization_id = p_organization_id
              AND job.job_type = 'analysis'
              AND job.status IN ('pending', 'running')
        ),
        'confidence_distribution', jsonb_build_object(
            'low', confidence_summary.low,
            'medium', confidence_summary.medium,
            'high', confidence_summary.high
        ),
        'confidence_sample_count', confidence_summary.sample_count,
        'sentiment_distribution', jsonb_build_object(
            'positive', current_summary.sentiment_positive,
            'neutral', current_summary.sentiment_neutral,
            'negative', current_summary.sentiment_negative
        ),
        'comparison_successful_analyses', previous_summary.successful_analyses,
        'comparison_sentiment_distribution', jsonb_build_object(
            'positive', previous_summary.sentiment_positive,
            'neutral', previous_summary.sentiment_neutral,
            'negative', previous_summary.sentiment_negative
        ),
        'topic_distribution', coalesce((
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'name', name, 'mentions', mentions)
                ORDER BY mentions DESC, name
            )
            FROM current_topics
        ), '[]'::jsonb),
        'complaint_distribution', coalesce((
            SELECT jsonb_agg(
                jsonb_build_object('id', id, 'category', category, 'mentions', mentions)
                ORDER BY mentions DESC, category
            )
            FROM current_complaints
        ), '[]'::jsonb),
        'model_versions', coalesce((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'id', id,
                    'provider', provider,
                    'model', model_name,
                    'version', version,
                    'last_used_at', last_used_at,
                    'successful_analyses', successful_analyses,
                    'failed_analyses', failed_analyses
                )
                ORDER BY last_used_at DESC, model_name
            )
            FROM current_versions
        ), '[]'::jsonb)
    )
    INTO result
    FROM current_summary, previous_summary, confidence_summary;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.store_ai_insight(
    p_organization_id uuid,
    p_provider text,
    p_model_name text,
    p_model_version text,
    p_kind text,
    p_title text,
    p_summary text,
    p_confidence numeric,
    p_impact text,
    p_topic_id uuid,
    p_product_id uuid,
    p_complaint_id uuid,
    p_supporting_metrics jsonb,
    p_review_ids uuid[]
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    version_id uuid;
    insight_id uuid;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Server-side insight storage required' USING ERRCODE = '42501';
    END IF;
    IF p_provider IS NULL OR length(trim(p_provider)) NOT BETWEEN 1 AND 80
       OR p_model_name IS NULL OR length(trim(p_model_name)) NOT BETWEEN 1 AND 120
       OR p_model_version IS NULL OR length(trim(p_model_version)) NOT BETWEEN 1 AND 80
       OR p_kind IS NULL OR p_kind NOT IN (
            'sentiment_trend', 'emerging_complaint', 'product_issue',
            'topic_movement', 'rating_change', 'unusual_trend'
       )
       OR p_title IS NULL OR length(trim(p_title)) NOT BETWEEN 1 AND 240
       OR p_summary IS NULL OR length(trim(p_summary)) NOT BETWEEN 1 AND 2000
       OR p_title ~ '[0-9]' OR p_summary ~ '[0-9]'
       OR p_confidence IS NULL OR p_confidence NOT BETWEEN 0 AND 1
       OR p_impact IS NULL OR p_impact NOT IN ('low', 'medium', 'high', 'critical')
       OR jsonb_typeof(p_supporting_metrics) IS DISTINCT FROM 'object'
       OR coalesce(cardinality(p_review_ids), 0) > 20 THEN
        RAISE EXCEPTION 'Invalid structured insight' USING ERRCODE = '22023';
    END IF;
    IF EXISTS (
        SELECT 1
        FROM unnest(coalesce(p_review_ids, ARRAY[]::uuid[])) AS requested(review_id)
        LEFT JOIN public.reviews AS review
          ON review.organization_id = p_organization_id
         AND review.id = requested.review_id
        WHERE review.id IS NULL
    ) THEN
        RAISE EXCEPTION 'Insight evidence contains an unknown review'
            USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.model_versions (
        organization_id, provider, model_name, version, task, status
    )
    VALUES (
        p_organization_id, trim(p_provider), trim(p_model_name),
        trim(p_model_version), 'other', 'active'
    )
    ON CONFLICT (organization_id, model_name, version)
    DO UPDATE SET provider = EXCLUDED.provider, updated_at = now()
    RETURNING id INTO version_id;

    INSERT INTO public.ai_insights (
        organization_id,
        kind,
        title,
        summary,
        confidence,
        impact,
        topic_id,
        product_id,
        complaint_id,
        supporting_metrics,
        provider,
        model_name,
        model_version,
        model_version_id
    )
    VALUES (
        p_organization_id,
        p_kind,
        trim(p_title),
        trim(p_summary),
        p_confidence,
        p_impact,
        p_topic_id,
        p_product_id,
        p_complaint_id,
        p_supporting_metrics,
        trim(p_provider),
        trim(p_model_name),
        trim(p_model_version),
        version_id
    )
    RETURNING id INTO insight_id;

    INSERT INTO public.insight_reviews (organization_id, insight_id, review_id)
    SELECT p_organization_id, insight_id, evidence.review_id
    FROM (
        SELECT DISTINCT requested.review_id
        FROM unnest(coalesce(p_review_ids, ARRAY[]::uuid[])) AS requested(review_id)
    ) AS evidence;

    RETURN (
        SELECT jsonb_build_object(
            'id', insight.id,
            'kind', insight.kind,
            'title', insight.title,
            'summary', insight.summary,
            'confidence', insight.confidence,
            'impact', insight.impact,
            'topic_id', insight.topic_id,
            'product_id', insight.product_id,
            'complaint_id', insight.complaint_id,
            'supporting_metrics', insight.supporting_metrics,
            'provider', insight.provider,
            'model_name', insight.model_name,
            'model_version', insight.model_version,
            'generated_at', insight.generated_at,
            'is_new', insight.is_new,
            'related_review_ids', coalesce(to_jsonb(p_review_ids), '[]'::jsonb)
        )
        FROM public.ai_insights AS insight
        WHERE insight.organization_id = p_organization_id
          AND insight.id = insight_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_model_health(uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_model_health(uuid, integer) TO authenticated;
REVOKE ALL ON FUNCTION public.store_ai_insight(
    uuid, text, text, text, text, text, text, numeric, text, uuid, uuid, uuid, jsonb, uuid[]
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.store_ai_insight(
    uuid, text, text, text, text, text, text, numeric, text, uuid, uuid, uuid, jsonb, uuid[]
) TO service_role;

COMMENT ON TABLE public.model_metrics IS
    'Per-attempt analysis telemetry. Distribution breakdowns are aggregated from successful event rows; evaluation accuracy metrics remain NULL unless measured against labeled data.';
COMMENT ON COLUMN public.ai_insights.supporting_metrics IS
    'Database-derived metric evidence selected before AI interpretation; never use AI-generated values for business metrics.';

DO $$
BEGIN
    IF to_regprocedure('public.get_model_health(uuid,integer)') IS NULL
       OR to_regprocedure('public.store_ai_insight(uuid,text,text,text,text,text,text,numeric,text,uuid,uuid,uuid,jsonb,uuid[])') IS NULL
       OR NOT EXISTS (
           SELECT 1 FROM pg_trigger
           WHERE tgrelid = 'public.processing_jobs'::regclass
             AND tgname = 'processing_jobs_capture_analysis_metric'
             AND NOT tgisinternal
       ) THEN
        RAISE EXCEPTION 'Migration verification failed: Phase 6 functions or trigger are missing';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.ai_insights'::regclass
          AND conname = 'ai_insights_org_complaint_fk'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.model_metrics'::regclass
          AND conname = 'model_metrics_org_review_fk'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: Phase 6 tenant relationships are missing';
    END IF;
END;
$$;

COMMIT;
