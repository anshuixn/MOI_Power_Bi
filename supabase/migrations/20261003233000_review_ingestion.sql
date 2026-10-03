BEGIN;

ALTER TABLE public.reviews
    ADD COLUMN content_fingerprint text
        CHECK (content_fingerprint IS NULL OR content_fingerprint ~ '^[0-9a-f]{64}$');

CREATE UNIQUE INDEX reviews_content_fingerprint_unique
    ON public.reviews (organization_id, source_id, content_fingerprint)
    WHERE content_fingerprint IS NOT NULL;

ALTER TABLE public.import_batches
    ADD COLUMN accepted_count integer NOT NULL DEFAULT 0 CHECK (accepted_count >= 0),
    ADD COLUMN duplicate_count integer NOT NULL DEFAULT 0 CHECK (duplicate_count >= 0),
    ADD COLUMN rejected_count integer NOT NULL DEFAULT 0 CHECK (rejected_count >= 0),
    ADD COLUMN processing_count integer NOT NULL DEFAULT 0 CHECK (processing_count >= 0),
    ADD COLUMN failed_count integer NOT NULL DEFAULT 0 CHECK (failed_count >= 0);

CREATE TABLE public.import_batch_items (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL,
    import_batch_id uuid NOT NULL,
    row_number integer NOT NULL CHECK (row_number > 0),
    status text NOT NULL CHECK (status IN ('accepted', 'duplicate', 'rejected', 'failed')),
    review_id uuid,
    errors jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(errors) = 'array'),
    created_at timestamptz NOT NULL DEFAULT now(),
    FOREIGN KEY (organization_id, import_batch_id)
        REFERENCES public.import_batches(organization_id, id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id, review_id)
        REFERENCES public.reviews(organization_id, id) ON DELETE SET NULL (review_id),
    UNIQUE (organization_id, import_batch_id, row_number)
);
CREATE INDEX import_batch_items_status_idx
    ON public.import_batch_items (organization_id, import_batch_id, status, row_number);

ALTER TABLE public.import_batch_items ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.import_batch_items FROM PUBLIC, anon;
GRANT SELECT, INSERT ON public.import_batch_items TO authenticated;
CREATE POLICY import_batch_items_read_member ON public.import_batch_items
    FOR SELECT TO authenticated USING (app_private.is_org_member(organization_id));
CREATE POLICY import_batch_items_insert_writer ON public.import_batch_items
    FOR INSERT TO authenticated WITH CHECK (app_private.can_write_org(organization_id));

CREATE OR REPLACE FUNCTION public.ingest_review(
    p_organization_id uuid,
    p_external_id text,
    p_review_text text,
    p_rating smallint,
    p_product_id uuid,
    p_source_id uuid,
    p_review_date timestamptz,
    p_import_batch_id uuid,
    p_content_fingerprint text,
    p_sanitized_text text,
    p_detected_pii jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
    inserted_review_id uuid;
    duplicate_review_id uuid;
BEGIN
    IF auth.uid() IS NULL OR NOT app_private.can_write_org(p_organization_id) THEN
        RAISE EXCEPTION 'Organization write access denied' USING ERRCODE = '42501';
    END IF;

    INSERT INTO public.reviews (
        organization_id, external_id, review_text, rating, product_id, source_id,
        review_date, import_batch_id, content_fingerprint, processing_status
    )
    VALUES (
        p_organization_id, NULLIF(p_external_id, ''), p_review_text, p_rating,
        p_product_id, p_source_id, p_review_date, p_import_batch_id,
        p_content_fingerprint, 'queued'
    )
    ON CONFLICT DO NOTHING
    RETURNING id INTO inserted_review_id;

    IF inserted_review_id IS NULL THEN
        SELECT review.id
        INTO duplicate_review_id
        FROM public.reviews AS review
        WHERE review.organization_id = p_organization_id
          AND review.source_id = p_source_id
          AND (
              (p_external_id IS NOT NULL AND review.external_id = p_external_id)
              OR review.content_fingerprint = p_content_fingerprint
          )
        ORDER BY review.created_at, review.id
        LIMIT 1;

        IF duplicate_review_id IS NULL THEN
            RAISE EXCEPTION 'Review uniqueness conflict could not be resolved'
                USING ERRCODE = '23505';
        END IF;

        RETURN jsonb_build_object(
            'outcome', 'duplicate',
            'review_id', duplicate_review_id
        );
    END IF;

    INSERT INTO public.review_analysis (
        organization_id, review_id, sanitized_text, detected_pii
    )
    VALUES (
        p_organization_id, inserted_review_id, p_sanitized_text, p_detected_pii
    );

    INSERT INTO public.processing_jobs (
        organization_id, review_id, job_type, status
    )
    VALUES (
        p_organization_id, inserted_review_id, 'analysis', 'pending'
    );

    RETURN jsonb_build_object(
        'outcome', 'accepted',
        'review_id', inserted_review_id
    );
END;
$$;

REVOKE ALL ON FUNCTION public.ingest_review(
    uuid, text, text, smallint, uuid, uuid, timestamptz, uuid, text, text, jsonb
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ingest_review(
    uuid, text, text, smallint, uuid, uuid, timestamptz, uuid, text, text, jsonb
) TO authenticated;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class
        WHERE oid = 'public.import_batch_items'::regclass AND relrowsecurity
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: import item RLS is not enabled';
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_policy
        WHERE polrelid = 'public.import_batch_items'::regclass
          AND polname = 'import_batch_items_read_member'
    ) OR NOT EXISTS (
        SELECT 1 FROM pg_policy
        WHERE polrelid = 'public.import_batch_items'::regclass
          AND polname = 'import_batch_items_insert_writer'
    ) THEN
        RAISE EXCEPTION 'Migration verification failed: import item policies are missing';
    END IF;
    IF to_regclass('public.reviews_content_fingerprint_unique') IS NULL THEN
        RAISE EXCEPTION 'Migration verification failed: review fingerprint index is missing';
    END IF;
END;
$$;

COMMIT;
