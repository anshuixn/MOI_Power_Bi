BEGIN;

CREATE INDEX reviews_org_product_date_idx
    ON public.reviews (organization_id, product_id, review_date DESC, id DESC)
    WHERE product_id IS NOT NULL;
CREATE INDEX reviews_org_source_date_idx
    ON public.reviews (organization_id, source_id, review_date DESC, id DESC);
CREATE INDEX review_analysis_org_sentiment_review_idx
    ON public.review_analysis (organization_id, sentiment, review_id);

CREATE OR REPLACE FUNCTION public.get_topic_summaries(
    p_organization_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_product_id uuid DEFAULT NULL,
    p_source text DEFAULT NULL,
    p_sentiment text DEFAULT NULL,
    p_complaint_id uuid DEFAULT NULL,
    p_topic_id uuid DEFAULT NULL
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
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at THEN
        RAISE EXCEPTION 'Invalid analytics date range' USING ERRCODE = '22023';
    END IF;
    IF p_sentiment IS NOT NULL
       AND p_sentiment NOT IN ('positive', 'neutral', 'negative') THEN
        RAISE EXCEPTION 'Invalid sentiment filter' USING ERRCODE = '22023';
    END IF;
    IF p_source IS NOT NULL
       AND p_source NOT IN ('web_store', 'mobile_app', 'marketplace', 'survey', 'social') THEN
        RAISE EXCEPTION 'Invalid source filter' USING ERRCODE = '22023';
    END IF;

    WITH bounds AS (
        SELECT p_start_at - (p_end_at - p_start_at) AS previous_start
    ),
    filtered AS MATERIALIZED (
        SELECT
            review.id,
            review.review_date,
            review.product_id,
            analysis.sentiment
        FROM public.reviews AS review
        JOIN public.sources AS source
          ON source.organization_id = review.organization_id
         AND source.id = review.source_id
        LEFT JOIN public.review_analysis AS analysis
          ON analysis.organization_id = review.organization_id
         AND analysis.review_id = review.id
        CROSS JOIN bounds
        WHERE review.organization_id = p_organization_id
          AND review.review_date >= bounds.previous_start
          AND review.review_date < p_end_at
          AND (p_product_id IS NULL OR review.product_id = p_product_id)
          AND (p_source IS NULL OR source.code = p_source)
          AND (p_sentiment IS NULL OR analysis.sentiment = p_sentiment)
          AND (p_complaint_id IS NULL OR EXISTS (
              SELECT 1
              FROM public.review_complaints AS link
              WHERE link.organization_id = review.organization_id
                AND link.review_id = review.id
                AND link.complaint_id = p_complaint_id
          ))
          AND (p_topic_id IS NULL OR EXISTS (
              SELECT 1
              FROM public.review_topics AS link
              WHERE link.organization_id = review.organization_id
                AND link.review_id = review.id
                AND link.topic_id = p_topic_id
          ))
    ),
    aggregates AS (
        SELECT
            topic.id,
            topic.name,
            topic.keywords,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
            )::integer AS mentions,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= bounds.previous_start
                  AND filtered.review_date < p_start_at
            )::integer AS previous_mentions,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
                  AND filtered.sentiment = 'positive'
            )::integer AS positive_count,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
                  AND filtered.sentiment = 'neutral'
            )::integer AS neutral_count,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
                  AND filtered.sentiment = 'negative'
            )::integer AS negative_count,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
                  AND filtered.sentiment IS NOT NULL
            )::integer AS analyzed_count,
            (array_agg(
                filtered.id ORDER BY filtered.review_date DESC, filtered.id DESC
            ) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
            ))[1:3] AS sample_review_ids
        FROM public.topics AS topic
        CROSS JOIN bounds
        LEFT JOIN public.review_topics AS link
          ON link.organization_id = topic.organization_id
         AND link.topic_id = topic.id
        LEFT JOIN filtered
          ON filtered.id = link.review_id
        WHERE topic.organization_id = p_organization_id
          AND (p_topic_id IS NULL OR topic.id = p_topic_id)
        GROUP BY topic.id, topic.name, topic.keywords, bounds.previous_start
    )
    SELECT coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', id,
                'name', name,
                'mentions', mentions,
                'positive_pct', coalesce(
                    round(100.0 * positive_count / nullif(analyzed_count, 0), 1), 0
                ),
                'neutral_pct', coalesce(
                    round(100.0 * neutral_count / nullif(analyzed_count, 0), 1), 0
                ),
                'negative_pct', coalesce(
                    round(100.0 * negative_count / nullif(analyzed_count, 0), 1), 0
                ),
                'keywords', keywords,
                'trend', CASE
                    WHEN mentions > previous_mentions THEN 'rising'
                    WHEN mentions < previous_mentions THEN 'falling'
                    ELSE 'stable'
                END,
                'trend_pct', CASE
                    WHEN previous_mentions = 0 AND mentions > 0 THEN 100
                    WHEN previous_mentions = 0 THEN 0
                    ELSE round(
                        100.0 * (mentions - previous_mentions) / previous_mentions, 1
                    )
                END,
                'sample_review_ids', to_jsonb(coalesce(sample_review_ids, ARRAY[]::uuid[]))
            ) ORDER BY mentions DESC, name
        ),
        '[]'::jsonb
    )
    INTO result
    FROM aggregates;

    RETURN result;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_complaint_summaries(
    p_organization_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_product_id uuid DEFAULT NULL,
    p_source text DEFAULT NULL,
    p_sentiment text DEFAULT NULL,
    p_topic_id uuid DEFAULT NULL,
    p_complaint_id uuid DEFAULT NULL,
    p_severity text DEFAULT NULL,
    p_status text DEFAULT NULL
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
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at THEN
        RAISE EXCEPTION 'Invalid analytics date range' USING ERRCODE = '22023';
    END IF;
    IF p_sentiment IS NOT NULL
       AND p_sentiment NOT IN ('positive', 'neutral', 'negative') THEN
        RAISE EXCEPTION 'Invalid sentiment filter' USING ERRCODE = '22023';
    END IF;
    IF p_source IS NOT NULL
       AND p_source NOT IN ('web_store', 'mobile_app', 'marketplace', 'survey', 'social') THEN
        RAISE EXCEPTION 'Invalid source filter' USING ERRCODE = '22023';
    END IF;
    IF p_severity IS NOT NULL
       AND p_severity NOT IN ('low', 'medium', 'high', 'critical') THEN
        RAISE EXCEPTION 'Invalid complaint severity filter' USING ERRCODE = '22023';
    END IF;
    IF p_status IS NOT NULL
       AND p_status NOT IN ('open', 'investigating', 'resolved') THEN
        RAISE EXCEPTION 'Invalid complaint status filter' USING ERRCODE = '22023';
    END IF;

    WITH bounds AS (
        SELECT p_start_at - (p_end_at - p_start_at) AS previous_start
    ),
    filtered AS MATERIALIZED (
        SELECT
            review.id,
            review.review_date,
            review.product_id,
            analysis.sentiment
        FROM public.reviews AS review
        JOIN public.sources AS source
          ON source.organization_id = review.organization_id
         AND source.id = review.source_id
        LEFT JOIN public.review_analysis AS analysis
          ON analysis.organization_id = review.organization_id
         AND analysis.review_id = review.id
        CROSS JOIN bounds
        WHERE review.organization_id = p_organization_id
          AND review.review_date >= bounds.previous_start
          AND review.review_date < p_end_at
          AND (p_product_id IS NULL OR review.product_id = p_product_id)
          AND (p_source IS NULL OR source.code = p_source)
          AND (p_sentiment IS NULL OR analysis.sentiment = p_sentiment)
          AND (p_topic_id IS NULL OR EXISTS (
              SELECT 1
              FROM public.review_topics AS link
              WHERE link.organization_id = review.organization_id
                AND link.review_id = review.id
                AND link.topic_id = p_topic_id
          ))
    ),
    aggregates AS (
        SELECT
            complaint.id,
            complaint.category,
            complaint.description,
            complaint.severity,
            complaint.status,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
            )::integer AS mentions,
            count(filtered.id) FILTER (
                WHERE filtered.review_date >= bounds.previous_start
                  AND filtered.review_date < p_start_at
            )::integer AS previous_mentions,
            (array_agg(
                filtered.id ORDER BY filtered.review_date DESC, filtered.id DESC
            ) FILTER (
                WHERE filtered.review_date >= p_start_at
                  AND filtered.review_date < p_end_at
            ))[1:2] AS example_review_ids
        FROM public.complaints AS complaint
        CROSS JOIN bounds
        LEFT JOIN public.review_complaints AS link
          ON link.organization_id = complaint.organization_id
         AND link.complaint_id = complaint.id
        LEFT JOIN filtered
          ON filtered.id = link.review_id
        WHERE complaint.organization_id = p_organization_id
          AND (p_complaint_id IS NULL OR complaint.id = p_complaint_id)
          AND (p_severity IS NULL OR complaint.severity = p_severity)
          AND (p_status IS NULL OR complaint.status = p_status)
        GROUP BY
            complaint.id, complaint.category, complaint.description,
            complaint.severity, complaint.status, bounds.previous_start
    )
    SELECT coalesce(
        jsonb_agg(
            jsonb_build_object(
                'id', complaint_row.id,
                'category', complaint_row.category,
                'active_count', CASE
                    WHEN complaint_row.status = 'resolved' THEN 0
                    ELSE complaint_row.mentions
                END,
                'mentions', complaint_row.mentions,
                'severity', complaint_row.severity,
                'trend', CASE
                    WHEN complaint_row.mentions > complaint_row.previous_mentions THEN 'rising'
                    WHEN complaint_row.mentions < complaint_row.previous_mentions THEN 'falling'
                    ELSE 'stable'
                END,
                'trend_pct', CASE
                    WHEN complaint_row.previous_mentions = 0
                         AND complaint_row.mentions > 0 THEN 100
                    WHEN complaint_row.previous_mentions = 0 THEN 0
                    ELSE round(
                        100.0 * (complaint_row.mentions - complaint_row.previous_mentions)
                        / complaint_row.previous_mentions, 1
                    )
                END,
                'description', complaint_row.description,
                'example_review_ids', to_jsonb(
                    coalesce(complaint_row.example_review_ids, ARRAY[]::uuid[])
                ),
                'status', complaint_row.status,
                'affected_products', coalesce(product_values.json_values, '[]'::jsonb),
                'affected_topics', coalesce(topic_values.json_values, '[]'::jsonb)
            ) ORDER BY complaint_row.mentions DESC, complaint_row.category
        ),
        '[]'::jsonb
    )
    INTO result
    FROM aggregates AS complaint_row
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', product.id,
                'name', product.name,
                'mentions', product_mentions.mentions
            ) ORDER BY product_mentions.mentions DESC, product.name
        ) AS json_values
        FROM (
            SELECT filtered.product_id, count(*)::integer AS mentions
            FROM public.review_complaints AS complaint_link
            JOIN filtered
              ON filtered.id = complaint_link.review_id
             AND filtered.review_date >= p_start_at
             AND filtered.review_date < p_end_at
            WHERE complaint_link.organization_id = p_organization_id
              AND complaint_link.complaint_id = complaint_row.id
              AND filtered.product_id IS NOT NULL
            GROUP BY filtered.product_id
        ) AS product_mentions
        JOIN public.products AS product
          ON product.organization_id = p_organization_id
         AND product.id = product_mentions.product_id
    ) AS product_values ON true
    LEFT JOIN LATERAL (
        SELECT jsonb_agg(
            jsonb_build_object(
                'id', topic.id,
                'name', topic.name,
                'mentions', topic_mentions.mentions
            ) ORDER BY topic_mentions.mentions DESC, topic.name
        ) AS json_values
        FROM (
            SELECT topic_link.topic_id, count(*)::integer AS mentions
            FROM public.review_complaints AS complaint_link
            JOIN filtered
              ON filtered.id = complaint_link.review_id
             AND filtered.review_date >= p_start_at
             AND filtered.review_date < p_end_at
            JOIN public.review_topics AS topic_link
              ON topic_link.organization_id = complaint_link.organization_id
             AND topic_link.review_id = complaint_link.review_id
            WHERE complaint_link.organization_id = p_organization_id
              AND complaint_link.complaint_id = complaint_row.id
            GROUP BY topic_link.topic_id
        ) AS topic_mentions
        JOIN public.topics AS topic
          ON topic.organization_id = p_organization_id
         AND topic.id = topic_mentions.topic_id
    ) AS topic_values ON true;

    RETURN result;
END;
$$;

DROP FUNCTION public.get_dashboard_summary(uuid, timestamptz, timestamptz, uuid, text);

CREATE FUNCTION public.get_dashboard_summary(
    p_organization_id uuid,
    p_start_at timestamptz,
    p_end_at timestamptz,
    p_product_id uuid DEFAULT NULL,
    p_source text DEFAULT NULL,
    p_sentiment text DEFAULT NULL,
    p_topic_id uuid DEFAULT NULL,
    p_complaint_id uuid DEFAULT NULL
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
    IF p_start_at IS NULL OR p_end_at IS NULL OR p_end_at <= p_start_at THEN
        RAISE EXCEPTION 'Invalid analytics date range' USING ERRCODE = '22023';
    END IF;
    IF p_sentiment IS NOT NULL
       AND p_sentiment NOT IN ('positive', 'neutral', 'negative') THEN
        RAISE EXCEPTION 'Invalid sentiment filter' USING ERRCODE = '22023';
    END IF;
    IF p_source IS NOT NULL
       AND p_source NOT IN ('web_store', 'mobile_app', 'marketplace', 'survey', 'social') THEN
        RAISE EXCEPTION 'Invalid source filter' USING ERRCODE = '22023';
    END IF;

    WITH filtered AS MATERIALIZED (
        SELECT
            review.id,
            review.rating,
            review.review_date,
            source.code AS source_code,
            product.id AS product_id,
            product.name AS product_name,
            analysis.sentiment
        FROM public.reviews AS review
        JOIN public.sources AS source
          ON source.organization_id = review.organization_id
         AND source.id = review.source_id
        LEFT JOIN public.products AS product
          ON product.organization_id = review.organization_id
         AND product.id = review.product_id
        LEFT JOIN public.review_analysis AS analysis
          ON analysis.organization_id = review.organization_id
         AND analysis.review_id = review.id
        WHERE review.organization_id = p_organization_id
          AND review.review_date >= p_start_at - (p_end_at - p_start_at)
          AND review.review_date < p_end_at
          AND (p_product_id IS NULL OR review.product_id = p_product_id)
          AND (p_source IS NULL OR source.code = p_source)
          AND (p_sentiment IS NULL OR analysis.sentiment = p_sentiment)
          AND (p_topic_id IS NULL OR EXISTS (
              SELECT 1 FROM public.review_topics AS link
              WHERE link.organization_id = review.organization_id
                AND link.review_id = review.id
                AND link.topic_id = p_topic_id
          ))
          AND (p_complaint_id IS NULL OR EXISTS (
              SELECT 1 FROM public.review_complaints AS link
              WHERE link.organization_id = review.organization_id
                AND link.review_id = review.id
                AND link.complaint_id = p_complaint_id
          ))
    ),
    totals AS (
        SELECT
            count(*) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
            )::bigint AS total_reviews,
            coalesce(round((avg(rating) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
            ))::numeric, 2), 0) AS average_rating,
            count(sentiment) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
            )::bigint AS analyzed_reviews,
            count(*) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
                  AND sentiment = 'positive'
            )::bigint AS positive_count,
            count(*) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
                  AND sentiment = 'neutral'
            )::bigint AS neutral_count,
            count(*) FILTER (
                WHERE review_date >= p_start_at AND review_date < p_end_at
                  AND sentiment = 'negative'
            )::bigint AS negative_count
        FROM filtered
    ),
    comparisons AS (
        SELECT
            count(*) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at
            )::bigint AS total_reviews,
            coalesce(round((avg(rating) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at
            ))::numeric, 2), 0) AS average_rating,
            count(sentiment) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at
            )::bigint AS analyzed_reviews,
            count(*) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at AND sentiment = 'positive'
            )::bigint AS positive_count,
            count(*) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at AND sentiment = 'neutral'
            )::bigint AS neutral_count,
            count(*) FILTER (
                WHERE review_date >= p_start_at - (p_end_at - p_start_at)
                  AND review_date < p_start_at AND sentiment = 'negative'
            )::bigint AS negative_count
        FROM filtered
    ),
    rating_counts AS (
        SELECT coalesce(jsonb_object_agg(rating::text, count_value), '{}'::jsonb) AS value
        FROM (
            SELECT rating, count(*)::integer AS count_value
            FROM filtered
            WHERE review_date >= p_start_at AND review_date < p_end_at
            GROUP BY rating
        ) AS grouped
    ),
    source_counts AS (
        SELECT coalesce(jsonb_object_agg(source_code, count_value), '{}'::jsonb) AS value
        FROM (
            SELECT source_code, count(*)::integer AS count_value
            FROM filtered
            WHERE review_date >= p_start_at AND review_date < p_end_at
            GROUP BY source_code
        ) AS grouped
    ),
    product_counts AS (
        SELECT coalesce(jsonb_object_agg(product_name, count_value), '{}'::jsonb) AS value
        FROM (
            SELECT product_name, count(*)::integer AS count_value
            FROM filtered
            WHERE product_name IS NOT NULL
              AND review_date >= p_start_at AND review_date < p_end_at
            GROUP BY product_name
        ) AS grouped
    ),
    product_comparison AS (
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'product_id', product_id,
                'product_name', product_name,
                'review_count', count_value,
                'average_rating', average_rating
            ) ORDER BY count_value DESC, product_name
        ), '[]'::jsonb) AS value
        FROM (
            SELECT
                product_id,
                product_name,
                count(*)::integer AS count_value,
                round(avg(rating)::numeric, 2) AS average_rating
            FROM filtered
            WHERE product_id IS NOT NULL
              AND review_date >= p_start_at AND review_date < p_end_at
            GROUP BY product_id, product_name
        ) AS grouped
    ),
    source_comparison AS (
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'source', source_code,
                'review_count', count_value,
                'average_rating', average_rating
            ) ORDER BY count_value DESC, source_code
        ), '[]'::jsonb) AS value
        FROM (
            SELECT
                source_code,
                count(*)::integer AS count_value,
                round(avg(rating)::numeric, 2) AS average_rating
            FROM filtered
            WHERE review_date >= p_start_at AND review_date < p_end_at
            GROUP BY source_code
        ) AS grouped
    ),
    daily AS (
        SELECT
            (review_date AT TIME ZONE 'UTC')::date AS day,
            count(*)::integer AS review_count,
            count(sentiment) FILTER (WHERE sentiment = 'positive')::integer AS positive_count,
            count(sentiment) FILTER (WHERE sentiment = 'neutral')::integer AS neutral_count,
            count(sentiment) FILTER (WHERE sentiment = 'negative')::integer AS negative_count,
            count(sentiment)::integer AS analyzed_count
        FROM filtered
        WHERE review_date >= p_start_at AND review_date < p_end_at
        GROUP BY (review_date AT TIME ZONE 'UTC')::date
    ),
    review_volume AS (
        SELECT coalesce(jsonb_agg(
            jsonb_build_object('date', day, 'review_count', review_count)
            ORDER BY day
        ), '[]'::jsonb) AS value
        FROM daily
    ),
    sentiment_trend AS (
        SELECT coalesce(jsonb_agg(
            jsonb_build_object(
                'date', day,
                'review_count', analyzed_count,
                'positive', coalesce(round(100.0 * positive_count / nullif(analyzed_count, 0), 1), 0),
                'neutral', coalesce(round(100.0 * neutral_count / nullif(analyzed_count, 0), 1), 0),
                'negative', coalesce(round(100.0 * negative_count / nullif(analyzed_count, 0), 1), 0)
            ) ORDER BY day
        ), '[]'::jsonb) AS value
        FROM daily
        WHERE analyzed_count > 0
    ),
    active_complaints AS (
        SELECT count(DISTINCT filtered.id)::bigint AS value
        FROM filtered
        JOIN public.review_complaints AS link
          ON link.organization_id = p_organization_id
         AND link.review_id = filtered.id
        JOIN public.complaints AS complaint
          ON complaint.organization_id = link.organization_id
         AND complaint.id = link.complaint_id
        WHERE complaint.status <> 'resolved'
          AND filtered.review_date >= p_start_at
          AND filtered.review_date < p_end_at
    ),
    comparison_active_complaints AS (
        SELECT count(DISTINCT filtered.id)::bigint AS value
        FROM filtered
        JOIN public.review_complaints AS link
          ON link.organization_id = p_organization_id
         AND link.review_id = filtered.id
        JOIN public.complaints AS complaint
          ON complaint.organization_id = link.organization_id
         AND complaint.id = link.complaint_id
        WHERE complaint.status <> 'resolved'
          AND filtered.review_date >= p_start_at - (p_end_at - p_start_at)
          AND filtered.review_date < p_start_at
    )
    SELECT jsonb_build_object(
        'total_reviews', totals.total_reviews,
        'average_rating', totals.average_rating,
        'analyzed_reviews', totals.analyzed_reviews,
        'positive_count', totals.positive_count,
        'neutral_count', totals.neutral_count,
        'negative_count', totals.negative_count,
        'comparison', jsonb_build_object(
            'total_reviews', comparisons.total_reviews,
            'average_rating', comparisons.average_rating,
            'analyzed_reviews', comparisons.analyzed_reviews,
            'positive_count', comparisons.positive_count,
            'neutral_count', comparisons.neutral_count,
            'negative_count', comparisons.negative_count,
            'active_complaints', comparison_active_complaints.value
        ),
        'rating_distribution', rating_counts.value,
        'source_breakdown', source_counts.value,
        'product_breakdown', product_counts.value,
        'source_comparison', source_comparison.value,
        'product_comparison', product_comparison.value,
        'review_volume', review_volume.value,
        'sentiment_trend', sentiment_trend.value,
        'topics', public.get_topic_summaries(
            p_organization_id, p_start_at, p_end_at, p_product_id,
            p_source, p_sentiment, p_complaint_id, NULL
        ),
        'complaints', public.get_complaint_summaries(
            p_organization_id, p_start_at, p_end_at, p_product_id,
            p_source, p_sentiment, p_topic_id, NULL, NULL, NULL
        ),
        'active_complaints', active_complaints.value
    )
    INTO result
    FROM totals, rating_counts, source_counts, product_counts,
         product_comparison, source_comparison, review_volume,
         sentiment_trend, active_complaints, comparisons,
         comparison_active_complaints;

    RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_topic_summaries(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_complaint_summaries(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid, text, text
) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_dashboard_summary(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_topic_summaries(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_complaint_summaries(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid, text, text
) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dashboard_summary(
    uuid, timestamptz, timestamptz, uuid, text, text, uuid, uuid
) TO authenticated;

DO $$
BEGIN
    IF to_regprocedure(
        'public.get_dashboard_summary(uuid,timestamp with time zone,timestamp with time zone,uuid,text,text,uuid,uuid)'
    ) IS NULL OR to_regprocedure(
        'public.get_topic_summaries(uuid,timestamp with time zone,timestamp with time zone,uuid,text,text,uuid,uuid)'
    ) IS NULL OR to_regprocedure(
        'public.get_complaint_summaries(uuid,timestamp with time zone,timestamp with time zone,uuid,text,text,uuid,uuid,text,text)'
    ) IS NULL THEN
        RAISE EXCEPTION 'Migration verification failed: analytics RPC is missing';
    END IF;
    IF to_regclass('public.reviews_org_product_date_idx') IS NULL
       OR to_regclass('public.reviews_org_source_date_idx') IS NULL
       OR to_regclass('public.review_analysis_org_sentiment_review_idx') IS NULL THEN
        RAISE EXCEPTION 'Migration verification failed: analytics indexes are missing';
    END IF;
END;
$$;

COMMIT;
