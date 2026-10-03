BEGIN;

ALTER TABLE public.model_versions
    ADD COLUMN provider text NOT NULL DEFAULT 'unknown'
        CHECK (length(trim(provider)) BETWEEN 1 AND 80);
CREATE INDEX model_versions_provider_idx
    ON public.model_versions (organization_id, provider, model_name, version);

ALTER TABLE public.review_analysis
    ADD COLUMN analysis_status text NOT NULL DEFAULT 'pending'
        CHECK (analysis_status IN ('pending', 'processing', 'completed', 'failed')),
    ADD COLUMN failure_metadata jsonb NOT NULL DEFAULT '{}'::jsonb
        CHECK (jsonb_typeof(failure_metadata) = 'object');

REVOKE SELECT ON public.reviews FROM authenticated;
GRANT SELECT (
    id,
    organization_id,
    external_id,
    customer_identifier_hash,
    rating,
    product_id,
    source_id,
    import_batch_id,
    review_date,
    processing_status,
    created_at,
    updated_at,
    content_fingerprint
) ON public.reviews TO authenticated;

CREATE INDEX processing_jobs_review_status_idx
    ON public.processing_jobs (
        organization_id, review_id, job_type, status, created_at DESC
    )
    WHERE review_id IS NOT NULL;
CREATE INDEX processing_jobs_analysis_lease_idx
    ON public.processing_jobs (started_at, created_at, id)
    WHERE job_type = 'analysis' AND status = 'running';

CREATE OR REPLACE FUNCTION public.claim_review_analysis_job(
    p_max_attempts integer DEFAULT 5
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    claimed record;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Worker authorization required' USING ERRCODE = '42501';
    END IF;
    IF p_max_attempts < 1 OR p_max_attempts > 20 THEN
        RAISE EXCEPTION 'Invalid maximum attempts' USING ERRCODE = '22023';
    END IF;

    WITH abandoned AS (
        UPDATE public.processing_jobs AS job
        SET status = 'failed',
            completed_at = now(),
            error_message = 'worker_timeout',
            updated_at = now()
        WHERE job.job_type = 'analysis'
          AND job.status = 'running'
          AND job.started_at < now() - interval '5 minutes'
          AND job.attempts >= p_max_attempts
        RETURNING job.organization_id, job.review_id
    ),
    failed_analysis AS (
        UPDATE public.review_analysis AS analysis
        SET analysis_status = 'failed',
            failure_metadata = jsonb_build_object(
                'code', 'worker_timeout',
                'retryable', false
            ),
            updated_at = now()
        FROM abandoned
        WHERE analysis.organization_id = abandoned.organization_id
          AND analysis.review_id = abandoned.review_id
        RETURNING analysis.organization_id, analysis.review_id
    ),
    failed_reviews AS (
        UPDATE public.reviews AS review
        SET processing_status = 'failed',
            updated_at = now()
        FROM failed_analysis
        WHERE review.organization_id = failed_analysis.organization_id
          AND review.id = failed_analysis.review_id
        RETURNING review.organization_id, review.import_batch_id
    ),
    failed_batches AS (
        SELECT organization_id, import_batch_id, count(*)::integer AS item_count
        FROM failed_reviews
        WHERE import_batch_id IS NOT NULL
        GROUP BY organization_id, import_batch_id
    )
    UPDATE public.import_batches AS batch
    SET processing_count = greatest(0, batch.processing_count - failed_batches.item_count),
        updated_at = now()
    FROM failed_batches
    WHERE batch.organization_id = failed_batches.organization_id
      AND batch.id = failed_batches.import_batch_id;

    SELECT
        job.id AS job_id,
        job.organization_id,
        job.review_id,
        job.attempts + 1 AS attempt,
        review.review_text,
        analysis.detected_pii
    INTO claimed
    FROM public.processing_jobs AS job
    JOIN public.reviews AS review
      ON review.organization_id = job.organization_id
     AND review.id = job.review_id
    JOIN public.review_analysis AS analysis
      ON analysis.organization_id = job.organization_id
     AND analysis.review_id = review.id
    WHERE job.job_type = 'analysis'
      AND (
          (job.status = 'pending' AND job.available_at <= now())
          OR (
              job.status = 'running'
              AND job.started_at < now() - interval '5 minutes'
          )
      )
      AND job.attempts < p_max_attempts
    ORDER BY job.available_at, job.created_at, job.id
    FOR UPDATE OF job SKIP LOCKED
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    UPDATE public.processing_jobs
    SET status = 'running',
        attempts = claimed.attempt,
        started_at = now(),
        error_message = NULL,
        updated_at = now()
    WHERE id = claimed.job_id;

    UPDATE public.review_analysis
    SET analysis_status = 'processing',
        failure_metadata = '{}'::jsonb,
        updated_at = now()
    WHERE organization_id = claimed.organization_id
      AND review_id = claimed.review_id;

    UPDATE public.reviews
    SET processing_status = 'processing',
        updated_at = now()
    WHERE organization_id = claimed.organization_id
      AND id = claimed.review_id;

    RETURN jsonb_build_object(
        'job_id', claimed.job_id,
        'organization_id', claimed.organization_id,
        'review_id', claimed.review_id,
        'attempt', claimed.attempt,
        'review_text', claimed.review_text,
        'detected_pii', claimed.detected_pii,
        'topic_names', (
            SELECT coalesce(jsonb_agg(known.name ORDER BY known.name), '[]'::jsonb)
            FROM (
                SELECT topic.name
                FROM public.topics AS topic
                WHERE topic.organization_id = claimed.organization_id
                ORDER BY topic.name
                LIMIT 50
            ) AS known
        ),
        'complaint_categories', (
            SELECT coalesce(
                jsonb_agg(known.category ORDER BY known.category),
                '[]'::jsonb
            )
            FROM (
                SELECT complaint.category
                FROM public.complaints AS complaint
                WHERE complaint.organization_id = claimed.organization_id
                ORDER BY complaint.category
                LIMIT 50
            ) AS known
        )
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_review_analysis(
    p_job_id uuid,
    p_model_version_id uuid,
    p_analysis jsonb,
    p_sanitized_text text,
    p_detected_pii jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    job record;
    topic_item jsonb;
    complaint_item jsonb;
    topic_identifier uuid;
    complaint_identifier uuid;
    complaint_code text;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Worker authorization required' USING ERRCODE = '42501';
    END IF;
    IF jsonb_typeof(p_analysis) IS DISTINCT FROM 'object'
       OR p_analysis->>'sentiment' IS NULL
       OR p_analysis->>'sentiment' NOT IN ('positive', 'neutral', 'negative')
       OR jsonb_typeof(p_analysis->'topics') IS DISTINCT FROM 'array'
       OR jsonb_typeof(p_analysis->'complaints') IS DISTINCT FROM 'array'
       OR p_sanitized_text IS NULL
       OR jsonb_typeof(p_detected_pii) IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION 'Invalid structured review analysis' USING ERRCODE = '22023';
    END IF;
    IF p_analysis->>'sentiment_score' IS NULL
       OR p_analysis->>'sentiment_confidence' IS NULL
       OR (p_analysis->>'sentiment_score')::numeric NOT BETWEEN -1 AND 1
       OR (p_analysis->>'sentiment_confidence')::numeric NOT BETWEEN 0 AND 1 THEN
        RAISE EXCEPTION 'Invalid sentiment score or confidence' USING ERRCODE = '22023';
    END IF;

    SELECT organization_id, review_id
    INTO job
    FROM public.processing_jobs
    WHERE id = p_job_id
      AND job_type = 'analysis'
      AND status = 'running'
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis job is not running' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM public.model_versions AS version
        WHERE version.organization_id = job.organization_id
          AND version.id = p_model_version_id
    ) THEN
        RAISE EXCEPTION 'Model version does not belong to the review organization'
            USING ERRCODE = '23503';
    END IF;

    UPDATE public.review_analysis
    SET model_version_id = p_model_version_id,
        sentiment = p_analysis->>'sentiment',
        sentiment_score = (p_analysis->>'sentiment_score')::numeric,
        sentiment_confidence = (p_analysis->>'sentiment_confidence')::numeric,
        sanitized_text = p_sanitized_text,
        detected_pii = p_detected_pii,
        analysis_status = 'completed',
        failure_metadata = '{}'::jsonb,
        processed_at = now(),
        updated_at = now()
    WHERE organization_id = job.organization_id
      AND review_id = job.review_id;

    DELETE FROM public.review_topics
    WHERE organization_id = job.organization_id AND review_id = job.review_id;
    FOR topic_item IN SELECT value FROM jsonb_array_elements(p_analysis->'topics')
    LOOP
        IF topic_item->>'name' IS NULL
           OR length(trim(topic_item->>'name')) NOT BETWEEN 1 AND 160
           OR topic_item->>'confidence' IS NULL
           OR (topic_item->>'confidence')::numeric NOT BETWEEN 0 AND 1 THEN
            RAISE EXCEPTION 'Invalid topic classification' USING ERRCODE = '22023';
        END IF;
        INSERT INTO public.topics (organization_id, name)
        VALUES (job.organization_id, trim(topic_item->>'name'))
        ON CONFLICT (organization_id, name) DO NOTHING
        RETURNING id INTO topic_identifier;
        IF topic_identifier IS NULL THEN
            SELECT id INTO topic_identifier
            FROM public.topics
            WHERE organization_id = job.organization_id
              AND name = trim(topic_item->>'name');
        END IF;
        INSERT INTO public.review_topics (
            organization_id, review_id, topic_id, confidence
        )
        VALUES (
            job.organization_id, job.review_id, topic_identifier,
            (topic_item->>'confidence')::numeric
        );
    END LOOP;

    DELETE FROM public.review_complaints
    WHERE organization_id = job.organization_id AND review_id = job.review_id;
    FOR complaint_item IN SELECT value FROM jsonb_array_elements(p_analysis->'complaints')
    LOOP
        IF complaint_item->>'category' IS NULL
           OR length(trim(complaint_item->>'category')) NOT BETWEEN 1 AND 160
           OR complaint_item->>'severity' IS NULL
           OR complaint_item->>'severity' NOT IN ('low', 'medium', 'high', 'critical')
           OR complaint_item->>'confidence' IS NULL
           OR (complaint_item->>'confidence')::numeric NOT BETWEEN 0 AND 1 THEN
            RAISE EXCEPTION 'Invalid complaint classification' USING ERRCODE = '22023';
        END IF;
        complaint_code := trim(both '-' FROM regexp_replace(
            lower(trim(complaint_item->>'category')), '[^a-z0-9]+', '-', 'g'
        ));
        IF complaint_code = '' THEN
            complaint_code := 'complaint-' || substr(
                md5(lower(trim(complaint_item->>'category'))), 1, 12
            );
        END IF;
        INSERT INTO public.complaints (
            organization_id, code, category, description, severity, status
        )
        VALUES (
            job.organization_id, complaint_code,
            trim(complaint_item->>'category'), '', complaint_item->>'severity', 'open'
        )
        ON CONFLICT (organization_id, code) DO UPDATE
        SET category = EXCLUDED.category,
            severity = EXCLUDED.severity,
            updated_at = now()
        RETURNING id INTO complaint_identifier;
        INSERT INTO public.review_complaints (
            organization_id, review_id, complaint_id, confidence
        )
        VALUES (
            job.organization_id, job.review_id, complaint_identifier,
            (complaint_item->>'confidence')::numeric
        );
    END LOOP;

    UPDATE public.processing_jobs
    SET status = 'completed',
        completed_at = now(),
        error_message = NULL,
        updated_at = now()
    WHERE id = p_job_id;
    UPDATE public.reviews
    SET processing_status = 'processed',
        updated_at = now()
    WHERE organization_id = job.organization_id AND id = job.review_id;
    UPDATE public.import_batches
    SET processing_count = greatest(0, processing_count - 1),
        updated_at = now()
    WHERE organization_id = job.organization_id
      AND id = (
          SELECT import_batch_id FROM public.reviews
          WHERE organization_id = job.organization_id AND id = job.review_id
      )
      AND processing_count > 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.fail_review_analysis(
    p_job_id uuid,
    p_model_version_id uuid,
    p_failure_code text,
    p_retry_delay_seconds integer,
    p_max_attempts integer
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    job record;
    retry_scheduled boolean;
BEGIN
    IF auth.role() IS DISTINCT FROM 'service_role' THEN
        RAISE EXCEPTION 'Worker authorization required' USING ERRCODE = '42501';
    END IF;
    IF p_failure_code NOT IN ('provider_error', 'invalid_output', 'processing_error')
       OR p_retry_delay_seconds < 0
       OR p_max_attempts < 1 THEN
        RAISE EXCEPTION 'Invalid failure metadata' USING ERRCODE = '22023';
    END IF;

    SELECT organization_id, review_id, attempts
    INTO job
    FROM public.processing_jobs
    WHERE id = p_job_id AND job_type = 'analysis' AND status = 'running'
    FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Analysis job is not running' USING ERRCODE = '22023';
    END IF;

    retry_scheduled := job.attempts < p_max_attempts;
    UPDATE public.review_analysis
    SET model_version_id = p_model_version_id,
        analysis_status = 'failed',
        failure_metadata = jsonb_build_object(
            'code', p_failure_code,
            'attempt', job.attempts,
            'retryable', retry_scheduled
        ),
        updated_at = now()
    WHERE organization_id = job.organization_id AND review_id = job.review_id;

    UPDATE public.processing_jobs
    SET status = CASE WHEN retry_scheduled THEN 'pending' ELSE 'failed' END,
        available_at = CASE
            WHEN retry_scheduled THEN now() + make_interval(secs => p_retry_delay_seconds)
            ELSE available_at
        END,
        completed_at = CASE WHEN retry_scheduled THEN NULL ELSE now() END,
        error_message = p_failure_code,
        updated_at = now()
    WHERE id = p_job_id;

    UPDATE public.reviews
    SET processing_status = CASE WHEN retry_scheduled THEN 'queued' ELSE 'failed' END,
        updated_at = now()
    WHERE organization_id = job.organization_id AND id = job.review_id;

    IF NOT retry_scheduled THEN
        UPDATE public.import_batches
        SET processing_count = greatest(0, processing_count - 1),
            updated_at = now()
        WHERE organization_id = job.organization_id
          AND id = (
              SELECT import_batch_id FROM public.reviews
              WHERE organization_id = job.organization_id AND id = job.review_id
          )
          AND processing_count > 0;
    END IF;

    RETURN jsonb_build_object(
        'retry_scheduled', retry_scheduled,
        'attempt', job.attempts
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.retry_review_analysis(
    p_organization_id uuid,
    p_review_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    retry_job_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT app_private.can_write_org(p_organization_id) THEN
        RETURN jsonb_build_object('outcome', 'forbidden');
    END IF;

    SELECT job.id
    INTO retry_job_id
    FROM public.processing_jobs AS job
    JOIN public.reviews AS review
      ON review.organization_id = job.organization_id AND review.id = job.review_id
    WHERE job.organization_id = p_organization_id
      AND job.review_id = p_review_id
      AND job.job_type = 'analysis'
      AND job.status = 'failed'
      AND review.processing_status = 'failed'
    ORDER BY job.created_at DESC, job.id DESC
    FOR UPDATE OF job
    LIMIT 1;

    IF retry_job_id IS NULL THEN
        IF NOT EXISTS (
            SELECT 1 FROM public.reviews
            WHERE organization_id = p_organization_id AND id = p_review_id
        ) THEN
            RETURN jsonb_build_object('outcome', 'not_found');
        END IF;
        RETURN jsonb_build_object('outcome', 'not_retryable');
    END IF;

    UPDATE public.processing_jobs
    SET status = 'pending',
        attempts = 0,
        available_at = now(),
        started_at = NULL,
        completed_at = NULL,
        error_message = NULL,
        updated_at = now()
    WHERE id = retry_job_id;
    UPDATE public.reviews
    SET processing_status = 'queued', updated_at = now()
    WHERE organization_id = p_organization_id AND id = p_review_id;
    UPDATE public.review_analysis
    SET analysis_status = 'pending',
        failure_metadata = '{}'::jsonb,
        updated_at = now()
    WHERE organization_id = p_organization_id AND review_id = p_review_id;
    UPDATE public.import_batches
    SET processing_count = processing_count + 1, updated_at = now()
    WHERE organization_id = p_organization_id
      AND id = (
          SELECT import_batch_id FROM public.reviews
          WHERE organization_id = p_organization_id AND id = p_review_id
      );

    RETURN jsonb_build_object('outcome', 'queued', 'job_id', retry_job_id);
END;
$$;

REVOKE ALL ON FUNCTION public.claim_review_analysis_job(integer)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.complete_review_analysis(uuid, uuid, jsonb, text, jsonb)
    FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.fail_review_analysis(uuid, uuid, text, integer, integer)
    FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_review_analysis_job(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_review_analysis(uuid, uuid, jsonb, text, jsonb)
    TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_review_analysis(uuid, uuid, text, integer, integer)
    TO service_role;

REVOKE ALL ON FUNCTION public.retry_review_analysis(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.retry_review_analysis(uuid, uuid) TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'public.review_analysis'::regclass
          AND conname = 'review_analysis_analysis_status_check'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: analysis status constraint is missing';
    END IF;
    IF to_regprocedure('public.claim_review_analysis_job(integer)') IS NULL
       OR to_regprocedure('public.complete_review_analysis(uuid,uuid,jsonb,text,jsonb)') IS NULL
       OR to_regprocedure('public.fail_review_analysis(uuid,uuid,text,integer,integer)') IS NULL
       OR to_regprocedure('public.retry_review_analysis(uuid,uuid)') IS NULL THEN
        RAISE EXCEPTION 'Migration verification failed: analysis pipeline functions are missing';
    END IF;
    IF has_column_privilege(
        'authenticated', 'public.reviews', 'review_text', 'SELECT'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: raw review text is selectable by API users';
    END IF;
END;
$$;

COMMIT;
