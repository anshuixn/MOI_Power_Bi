BEGIN;

DO $$
DECLARE
    required_view text;
BEGIN
    IF app_private.powerbi_organization_id() IS NULL THEN
        RAISE EXCEPTION 'Connected database login is not mapped to a Power BI organization';
    END IF;

    FOREACH required_view IN ARRAY ARRAY[
        'dim_products',
        'dim_sources',
        'dim_topics',
        'dim_complaints',
        'dim_sentiments',
        'dim_ratings',
        'dim_dates',
        'dim_model_versions',
        'fact_reviews',
        'fact_review_topics',
        'fact_review_complaints',
        'fact_model_attempts',
        'fact_model_confidences',
        'fact_model_topics',
        'fact_model_complaints',
        'fact_insights',
        'bridge_insight_reviews'
    ]
    LOOP
        IF to_regclass('reviewband_bi.' || required_view) IS NULL THEN
            RAISE EXCEPTION 'Missing Power BI view: %', required_view;
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM pg_class AS relation
            WHERE relation.oid = to_regclass('reviewband_bi.' || required_view)
              AND relation.reloptions @> ARRAY['security_invoker=true']
        ) THEN
            RAISE EXCEPTION 'Power BI view is not security-invoker: %', required_view;
        END IF;
    END LOOP;

    IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'reviewband_bi'
          AND column_name IN (
              'review_text', 'sanitized_text', 'customer_identifier_hash',
              'detected_pii', 'customer_email', 'customer_phone'
          )
    ) THEN
        RAISE EXCEPTION 'A Power BI view exposes a prohibited review/PII field';
    END IF;

    IF has_table_privilege('powerbi_reader', 'public.reviews', 'SELECT') THEN
        RAISE EXCEPTION 'Reporting role has broad review-table SELECT';
    END IF;
    IF has_column_privilege('powerbi_reader', 'public.reviews', 'review_text', 'SELECT') THEN
        RAISE EXCEPTION 'Reporting role can read raw review text';
    END IF;
END;
$$;

DO $$
DECLARE
    invalid_links bigint;
BEGIN
    SELECT count(*) INTO invalid_links
    FROM reviewband_bi.fact_review_topics AS fact
    LEFT JOIN reviewband_bi.dim_topics AS topic USING (organization_id, topic_id)
    LEFT JOIN reviewband_bi.dim_products AS product USING (organization_id, product_id)
    LEFT JOIN reviewband_bi.dim_sources AS source USING (organization_id, source_id)
    LEFT JOIN reviewband_bi.dim_dates AS calendar USING (date_key)
    WHERE topic.topic_id IS NULL
       OR (fact.product_id IS NOT NULL AND product.product_id IS NULL)
       OR source.source_id IS NULL
       OR calendar.date_key IS NULL;

    IF invalid_links <> 0 THEN
        RAISE EXCEPTION 'Found % invalid review-topic dimension links', invalid_links;
    END IF;

    SELECT count(*) INTO invalid_links
    FROM reviewband_bi.fact_review_complaints AS fact
    LEFT JOIN reviewband_bi.dim_complaints AS complaint
        USING (organization_id, complaint_id)
    LEFT JOIN reviewband_bi.dim_products AS product
        USING (organization_id, product_id)
    LEFT JOIN reviewband_bi.dim_sources AS source
        USING (organization_id, source_id)
    LEFT JOIN reviewband_bi.dim_dates AS calendar USING (date_key)
    WHERE complaint.complaint_id IS NULL
       OR (fact.product_id IS NOT NULL AND product.product_id IS NULL)
       OR source.source_id IS NULL
       OR calendar.date_key IS NULL;

    IF invalid_links <> 0 THEN
        RAISE EXCEPTION 'Found % invalid review-complaint dimension links', invalid_links;
    END IF;

    SELECT count(*) INTO invalid_links
    FROM reviewband_bi.fact_reviews AS fact
    LEFT JOIN reviewband_bi.dim_products AS product
        USING (organization_id, product_id)
    LEFT JOIN reviewband_bi.dim_sources AS source
        USING (organization_id, source_id)
    LEFT JOIN reviewband_bi.dim_ratings AS rating USING (rating)
    LEFT JOIN reviewband_bi.dim_sentiments AS sentiment USING (sentiment)
    LEFT JOIN reviewband_bi.dim_dates AS calendar USING (date_key)
    WHERE (fact.product_id IS NOT NULL AND product.product_id IS NULL)
       OR source.source_id IS NULL
       OR rating.rating IS NULL
       OR sentiment.sentiment IS NULL
       OR calendar.date_key IS NULL;

    IF invalid_links <> 0 THEN
        RAISE EXCEPTION 'Found % invalid review fact dimension links', invalid_links;
    END IF;

    SELECT count(*) INTO invalid_links
    FROM reviewband_bi.fact_insights AS fact
    LEFT JOIN reviewband_bi.dim_topics AS topic
        USING (organization_id, topic_id)
    LEFT JOIN reviewband_bi.dim_products AS product
        USING (organization_id, product_id)
    LEFT JOIN reviewband_bi.dim_complaints AS complaint
        USING (organization_id, complaint_id)
    LEFT JOIN reviewband_bi.dim_dates AS calendar USING (date_key)
    WHERE (fact.topic_id IS NOT NULL AND topic.topic_id IS NULL)
       OR (fact.product_id IS NOT NULL AND product.product_id IS NULL)
       OR (fact.complaint_id IS NOT NULL AND complaint.complaint_id IS NULL)
       OR calendar.date_key IS NULL;

    IF invalid_links <> 0 THEN
        RAISE EXCEPTION 'Found % invalid insight dimension links', invalid_links;
    END IF;
END;
$$;

SELECT
    (SELECT count(*) FROM reviewband_bi.fact_reviews) AS reviews_visible_to_tenant,
    (SELECT count(*) FROM reviewband_bi.fact_review_topics) AS topic_links_visible_to_tenant,
    (SELECT count(*) FROM reviewband_bi.fact_review_complaints) AS complaint_links_visible_to_tenant,
    (SELECT count(*) FROM reviewband_bi.fact_model_attempts) AS model_attempts_visible_to_tenant,
    (SELECT count(*) FROM reviewband_bi.fact_insights) AS insights_visible_to_tenant;

ROLLBACK;
