# Supabase database migrations

Apply migrations to the linked Supabase project's PostgreSQL 15+ database in version order:

1. `20261003230000_initial_reviewband_schema.sql`
2. `20261003233000_review_ingestion.sql`
3. `20261004001000_review_analysis_pipeline.sql`
4. `20261004002000_real_analytics_catalog.sql`
5. `20261004003000_ai_insights_model_health.sql`
6. `20261004004000_power_bi_analytics.sql`
7. `20261006001000_admin_model_health_access.sql`

For a direct PostgreSQL connection, run:

```sh
psql "$SUPABASE_DB_URL" --set ON_ERROR_STOP=1 \
  --file supabase/migrations/20261003230000_initial_reviewband_schema.sql \
  --file supabase/migrations/20261003233000_review_ingestion.sql \
  --file supabase/migrations/20261004001000_review_analysis_pipeline.sql \
  --file supabase/migrations/20261004002000_real_analytics_catalog.sql \
  --file supabase/migrations/20261004003000_ai_insights_model_health.sql \
  --file supabase/migrations/20261004004000_power_bi_analytics.sql \
  --file supabase/migrations/20261006001000_admin_model_health_access.sql
```

Each migration is transactional and ends with database-side verification checks. The initial migration checks all domain tables, enabled RLS and policies, required indexes, review constraints, and tenant-scoped foreign keys. The ingestion migration adds the database-enforced duplicate fingerprint, row-level import results and counts, and an atomic review/analysis/job insertion function. The analysis migration adds model-provider tracking, analysis state and safe failure metadata, plus service-role-only atomic worker functions for claiming, completing, and failing/retrying analysis jobs. The analytics migration adds tenant-checked, filter-aware SQL aggregations for dashboards, topic and complaint catalogs, affected products/topics, time-series comparisons, and supporting indexes. The AI insights/model health migration stores database-selected evidence and provider/model metadata, records each completed or failed analysis attempt, and exposes tenant-checked insight storage and model-health aggregate functions. The Power BI migration adds a one-tenant-per-login reporting role map, row-level tenant isolation, least-privilege column grants, and PII-minimized analytics views. The administrator-access migration restricts model-health RPC access to organization owners and administrators. Do not apply a migration a second time; record each applied version in the deployment's migration history.

## Data-model decisions

- All tenant-owned records carry `organization_id`; composite foreign keys prevent links from crossing organizations. Products and sources are organization-specific.
- `profiles.id` references Supabase Auth users. Email and other authentication PII remain in `auth.users`, not copied into application profiles.
- There is no customer table. `customer_identifier_hash` is nullable and intended only for a non-reversible, organization-scoped HMAC-SHA-256 key when deduplication or customer-level analytics are actually needed; the database rejects non-hex/incorrectly sized values.
- Raw review content stays in `reviews.review_text`; sanitized display content and non-value PII metadata are separate fields in `review_analysis`. Entity values must not be put into `detected_pii`.
- Topics and complaints use many-to-many link tables with confidence values rather than duplicating ID arrays on reviews. Sentiment label, score, and confidence are stored once per analysis; percentages, counts, distributions, and time series are query-time aggregates.
- Model health is derived from model versions and metric samples rather than duplicated in another mutable health table. Report filters and run snapshots, import column mappings, processing payloads, notification payloads, and PII metadata are JSONB because their shapes are intentionally extensible.
- Model health aggregates per-attempt telemetry linked to model versions and reviews; success/failure counts, latency percentiles, confidence/sentiment/topic/complaint distributions come from these persisted events. A sentiment-distribution total-variation indicator is available only when both equal-length historical windows contain at least 30 successful analyses. This is a descriptive distribution comparison, not a claim of trained-model or feature drift. Accuracy/precision/recall are not reported without labeled evaluation data.
- Health status is `unknown` with no observed attempts, `offline` when every attempt failed, `degraded` when at least 20% of attempts failed, and `online` otherwise. Processing latency is measured from worker claim to completion/failure; queue depth counts pending and running analysis jobs.
- AI insights store supporting metrics assembled from database analytics before the provider request. Numeric supporting metrics are authored and persisted by the server, never by the provider. Insight type, provider, model/version, related topic/product/complaint, and supporting review links are retained.
- Topic and complaint trends are computed from current versus preceding equal-length review windows at query time; no derived trend values are stored.
- Analytics, topic and complaint trends compare the selected interval with the immediately preceding interval of equal duration. When the preceding interval has no mentions and the selected interval does, the returned percentage is 100% (a finite “new activity” marker); when both intervals have no mentions it is 0%.
- All analytics and catalog filters use UTC review timestamps with inclusive start and exclusive end. A custom date range includes both calendar dates by converting the end date to midnight UTC on the following day. Sentiment percentages use analyzed reviews as their denominator; total review and rating counts include unanalyzed reviews.
- `/api/v1/topics/{topic_id}/reviews` and `/api/v1/complaints/{complaint_id}/reviews` use database-side pagination and return `{items,total,page,pageSize,pageCount}`. Topic and complaint aggregates are calculated in SQL rather than loading review/link tables into application memory.

## API database access

Database-backed routes require a Supabase access token in `Authorization: Bearer ...` and a member organization UUID in `X-Organization-ID`. The backend verifies both, creates a request-scoped client using `SUPABASE_PUBLISHABLE_KEY` (legacy anon-key fallback), and leaves row isolation to RLS in addition to explicit repository scoping. `SUPABASE_SECRET_KEY` (or legacy `SUPABASE_SERVICE_ROLE_KEY`) is never used for user-facing database queries and must remain in server-only secrets; never prefix it with `VITE_`.

The frontend is still on its existing mock services. Authentication UI and API wiring remain follow-up work.

AI insight generation reads evidence through the authenticated, organization-scoped client. Only the subsequent atomic storage RPC uses the server-only service-role client, after the request's user and organization membership have been verified. The RPC is not executable by `authenticated` or `anon` roles, so clients cannot submit forged metric evidence or insights directly.

## Review ingestion

- `POST /api/v1/reviews/` accepts JSON with `review_text`, integer `rating` (1-5), configured `source` code/name, ISO-8601 `review_date`, optional organization-owned `product_id`, and optional `external_id`.
- `POST /api/v1/reviews/import` accepts a multipart UTF-8 CSV file. Required headers are `review_text`, `rating`, `review_date`, and `source`; optional headers are `product` (configured name or SKU) and `external_id`. Header matching ignores case and normalizes spaces/hyphens to underscores. Limit: 5 MiB and 1,000 data rows.
- CSV ratings must be whole numbers 1-5. Dates must be ISO-8601 dates or timestamps; timestamps without a timezone are interpreted as UTC. Empty text/source, unknown or ambiguous source/product mappings, malformed extra fields, and invalid dates/ratings are reported per row. Missing headers, invalid UTF-8, malformed quoting, and file-size violations reject the upload with a validation response.
- Review text is Unicode NFC normalized and whitespace-collapsed. Emails, phone numbers, URLs, street-address patterns, SSNs, and IPv4 addresses are replaced in the sanitized analysis text; PII metadata records entity type and field only. Original review text remains stored in `reviews.review_text`, but the analysis migration removes column-level SELECT access to that field for API users; review search uses sanitized text.
- Duplicate detection is enforced atomically by PostgreSQL: a non-empty `(organization, source, external_id)` match or a SHA-256 fingerprint of `(organization, source, product, UTC review date, normalized case-folded review text)` returns the existing review instead of inserting another. The fingerprint excludes rating to avoid repeated copies of the same review when ratings are corrected.
- A newly accepted review, its sanitized analysis row, and a pending analysis job are committed in one database function call. AI calls are not made synchronously. `processing` in import summaries is a subset of `accepted` queued for future analysis workers; row outcomes are individually `accepted`, `duplicate`, `rejected`, or `failed`.
- `GET /api/v1/reviews/imports/{batch_id}` returns persisted batch totals and row-level outcomes without saving submitted raw CSV row values. Large/background AI execution remains for a later phase.

## Review analysis and PII processing

- Configure the backend with `AI_PROVIDER=openai`, a server-only `OPENAI_API_KEY`, `OPENAI_MODEL` (defaults to `gpt-4o-mini`), optional `OPENAI_MODEL_VERSION` for a pinned deployment identifier, and `ANALYSIS_MAX_ATTEMPTS` (defaults to 5, allowed 1-20). The provider-reported model identifier takes precedence unless it is only the configured model alias. Do not use `VITE_` prefixes for AI or Supabase service-role secrets.
- Ingestion stores original review content in the restricted review table and redacted text plus entity-type/field metadata in `review_analysis`. The worker re-applies the PII stage before sending only sanitized text and organization topic/complaint taxonomy to the provider. Email, phone, URL, SSN, IPv4, and detectable street addresses are redacted; logs contain job identifiers and exception types only, never review text or provider exception messages.
- OpenAI structured Responses output is parsed into strict Pydantic models with constrained sentiment labels/scores/confidence, bounded topic/complaint lists, valid severities, and duplicate-name validation. Invalid/unavailable provider results are not converted into invented analysis.
- `model_versions` stores provider, model name, and provider-returned model version; each `review_analysis.model_version_id` references that record. Successful analysis stores sentiment/score/confidence, sanitized text, PII metadata, `processed_at`, topic/confidence links, and complaint/severity/confidence links transactionally.
- A separate worker claims jobs with `FOR UPDATE SKIP LOCKED`. Run one available job with `cd backend && .venv/bin/python -m app.worker --once`; omit `--once` to poll continuously. In production, run this command in a durable worker/scheduler with `SUPABASE_URL`, server-only `SUPABASE_SECRET_KEY` (or legacy service-role key), and Gemini settings (`GEMINI_API_KEY`, `GEMINI_MODEL`, `AI_PROVIDER=gemini`). Do not run provider requests from API routes.
- Failures store only a safe code (`provider_error`, `invalid_output`, or `processing_error`), attempt count, and retryable flag. Retry delays grow exponentially and cap at one hour; at the configured attempt limit the review/job become failed. Authorized organization writers can manually requeue a terminally failed analysis with `POST /api/v1/reviews/{review_id}/analysis/retry`.
- This repository's Vercel deployment routes `/api/*` to FastAPI and other paths to the Vite frontend using Vercel Services. Vercel API deployments still require the backend environment variables above. The durable worker is a separate process and must be hosted/scheduled independently; a Vercel web function does not run the CLI worker continuously.
