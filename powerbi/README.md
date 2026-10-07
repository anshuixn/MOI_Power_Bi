# ReviewBand Power BI

Power BI is the separate business-intelligence/reporting layer. React remains the product UI; Power BI connects directly to Supabase PostgreSQL and never reads the React app or calls the AI provider.

## Source and connection

Use Power BI Desktop's built-in **PostgreSQL database** connector against the Supabase PostgreSQL database, not the Supabase REST URL. Configure the project database host, port, and database name (normally `postgres`) from Supabase's Connect settings; the model's `PbiServer` parameter expects `host:port`. Require TLS/SSL in the connector credentials and use Power BI Import mode with scheduled refresh for the initial deployment. DirectQuery may be evaluated separately against real workload and connector limitations.

After applying all migrations in order through `20261006001000_admin_model_health_access.sql`, connect to the `reviewband_bi` schema and load the views listed below. Use a dedicated database login for exactly one organization. Never put a database password, Supabase secret/service-role key, or Gemini API key in this repository, Power Query source, PBIP parameters, or a report.

### Provisioning a tenant-specific reporting login

Run these statements as a trusted Supabase database administrator, substituting a unique login name, organization UUID, and a strong password supplied through the database credential manager. Do not use a shared `postgres`, `service_role`, or service account mapped to multiple organizations.

```sql
CREATE ROLE reviewband_pbi_org_example
    LOGIN INHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS
    PASSWORD '<set-out-of-band>';
GRANT powerbi_reader TO reviewband_pbi_org_example;

INSERT INTO app_private.powerbi_organization_access (login_role, organization_id)
VALUES ('reviewband_pbi_org_example', '<organization-uuid>');
```

Power BI must connect directly as that login so PostgreSQL `session_user` remains the mapped login. Do not use a connection pooler credential that replaces `session_user` with a shared pool role. The `powerbi_reader` group has no login, no write grants, no `BYPASSRLS`, and only column-level source permissions needed by security-invoker views. A dedicated mapping plus RLS restricts every connection to exactly one tenant; provision a different login per tenant. Rotate/revoke credentials through the database secret-management process. Private networking/firewall rules and a Power BI gateway may be required by the deployment topology.

## Analytics-facing views

The migration exposes only `reviewband_bi` views. It deliberately avoids materialized views so Power BI sees current source data without refresh-time race conditions or a second persistence layer.

| View | Grain / use |
|---|---|
| `dim_dates` | One UTC calendar date with day, ISO week, month, quarter, and year attributes; spans review, model-event, and insight dates for the tenant. |
| `dim_products`, `dim_sources`, `dim_topics`, `dim_complaints` | Tenant-scoped dimensions. |
| `dim_sentiments`, `dim_ratings` | Small label dimensions for consistent slicers. |
| `dim_model_versions` | Provider/model/version/task dimension. |
| `fact_reviews` | One row per review, with date/product/source/rating and analysis status/sentiment. Raw and sanitized review text and PII metadata are excluded. |
| `fact_review_topics` | One row per review-topic assignment, with confidence and conformed review attributes. |
| `fact_review_complaints` | One row per review-complaint assignment, with severity/status/confidence and conformed review attributes. |
| `fact_model_attempts` | One row per actual model attempt with result, latency, sentiment, model version, and review dimensions. |
| `fact_model_confidences` | One row per captured sentiment/topic/complaint confidence score. |
| `fact_model_topics`, `fact_model_complaints` | Historical topic/complaint assignments recorded per successful analysis attempt. |
| `fact_insights` | One persisted insight per row, including provider/model/version and database-selected evidence JSON text; no AI-generated numeric metric is treated as fact. |
| `bridge_insight_reviews` | Persisted links between insights and supporting reviews. |

No base tables are granted wholesale to the reporting role. UUID keys retain tenant identity, all joins include tenant IDs in the SQL view definitions, and the Power BI model uses single-direction one-to-many relationships. Review text, customer hashes, and PII metadata are not in the views.

## Semantic model

[`ReviewBand.SemanticModel/`](./ReviewBand.SemanticModel) is a source-controlled TMDL model definition, not a PBIX and not a pre-published Power BI dataset. It defines import partitions for the reporting views, dimensions/facts, measures, and the active relationship graph. Open/import it with a TMDL-capable Tabular Editor/Power BI workflow, set the `PbiServer` parameter to the Supabase PostgreSQL host, set `PbiDatabase` (normally `postgres`), then provide the dedicated reporting login through the connector credential dialog. Do not store credentials in M expressions or source control.

The separate [ReviewBand.Measures.dax](./ReviewBand.Measures.dax) is a readable measure reference; production measures are also included in the TMDL table definitions. Relationships are stored in [`ReviewBand.SemanticModel/relationships.tmdl`](./ReviewBand.SemanticModel/relationships.tmdl). The model uses single-direction dimension-to-fact relationships. Date, product, source, rating, and sentiment dimensions filter applicable facts. Topic and complaint assignment facts are separate bridges; explicit DAX applies cross-filter selections by review ID to avoid ambiguous fact-to-fact relationship paths. Insight evidence links filter from insights to the disconnected evidence bridge; use `Insight Evidence Review Flag` as a table visual filter when listing associated review IDs.

Do not create direct topic-to-complaint or topic-to-product many-to-many relationships. Use distinct review IDs when a metric means reviews, rather than counting link rows. Technical IDs and tenant IDs are join keys, not business measures.

The imported `dim_dates` view is contiguous across actual tenant review, model-event, and insight dates and supplies day/week/month/quarter/year attributes. Mark `dim_dates[date_key]` as the model's date table in the authoring tool. The model uses explicit measures and sets identifiers/date keys not to summarize.

## Report pages

The six-page specification in [ReportPages.md](./ReportPages.md) describes visual intent and source fields. It is a report-authoring spec, not a fabricated PBIX or screenshot; report visuals, theme, layout, and live deployment must still be authored in Power BI Desktop and published to the organization's governed Power BI workspace.

## Validation

Run [power_bi_analytics_test.sql](../supabase/tests/power_bi_analytics_test.sql) while connected with the tenant-specific Power BI login. It raises on missing/non-invoker views, broad source-table access, raw-text/PII columns, or broken topic/complaint dimension links. Then load the model in Power BI and validate import/refresh, relationships, measures, each listed slicer, and dates across a period with actual tenant data.

This repository cannot prove a live Power BI-to-Supabase connection: it has no tenant database credentials, Power BI Desktop runtime, or database CLI in its current environment. Do not report live connection, refresh, relationship, or visual validation as complete until the above checks have been executed against the target Supabase project and Power BI tenant.

## Phase 8 operational runbook

### Repository-verified configuration

- `ReviewBand.SemanticModel/` contains 17 table definitions and 17 PostgreSQL **Import** partitions. It is a TMDL model source folder, not a PBIX, PBIP report, or published semantic model.
- `relationships.tmdl` contains 35 single-direction relationships. The 17 SQL views, 17 model tables, 35 relationships, and 39 measures reconcile with the current repository definitions.
- `ReportPages.md` specifies six report pages, but no report visuals/pages are present as a Power BI report artifact. The DAX reference and TMDL measures can be inspected in source; they have not been compiled by the Power BI engine here.
- The connector uses `PbiServer` (`host:port`) and `PbiDatabase` (`postgres` by default). All model partitions are Import mode, so data is a snapshot until the semantic model is refreshed.
- The Power BI database role is read-only and tenant-scoped by the login's `session_user` mapping. The Power BI login must connect directly; do not use a pooler login that replaces `session_user`.
- The reporting SQL derives date keys from timestamps in UTC. Review submission is queued for asynchronous AI analysis; a deployed worker must complete processing before an analysis record can appear in reporting views.

### Secure Desktop/model setup

1. Apply migrations in order, including `20261006001000_admin_model_health_access.sql`, and record them in the Supabase migration history. Do not edit or reapply already-applied migrations.
2. As a trusted database administrator, create one least-privilege Power BI login for the target organization using the provisioning template above. Set its strong password out-of-band, map that login to exactly one organization, and verify `session_user` is the mapped role on connection.
3. In Power BI Desktop on a supported Windows environment, open/import the existing TMDL folder with a TMDL-capable authoring workflow. Do not create another semantic model from scratch. The exact import/open workflow depends on the installed Desktop/Tabular Editor versions; this repository does not contain a PBIX/PBIP report.
4. Set `PbiServer` to the Supabase Connect host with port `5432`, and set `PbiDatabase` to `postgres` unless the project configuration says otherwise.
5. When prompted by the PostgreSQL connector, choose database/basic authentication, enter the dedicated login and its password into the secure credential prompt, and require SSL/TLS. Never paste credentials into a parameter, M expression, TMDL file, or report source.
6. Confirm the connector reaches PostgreSQL, then refresh the model. If prompted to select objects, use only the 17 objects in `reviewband_bi`; investigate any missing view or unexpected source object rather than selecting application or `auth` tables.
7. Confirm all tables load. In the model view, check that there are 35 relationships, each points to existing columns, and filters flow from dimensions to facts. Mark `dim_dates[date_key]` as the date table in the authoring tool.
8. Validate each measure in a simple table/card against the reconciliation queries below. Investigate differences in tenant mapping, refresh time, date window, model filters, and fact grain; do not patch report numbers to hide discrepancies.
9. Author the six pages from [ReportPages.md](./ReportPages.md), using the existing TMDL tables/measures. Do not add campaign analysis: campaign is not a current source attribute. Test the page slicers against populated data and verify blank values for metrics with insufficient samples are not shown as fabricated scores.
10. Test tenant isolation with two distinct mapped logins and organizations. Query the views directly as organization A, then attempt to retrieve organization B data; repeat as organization B. Each login must only return its own organization. A Power BI slicer is not a security test.
11. Until model-level client/admin role separation has been authored and tested, publish only to a workspace restricted to authorized administrators. The current TMDL has no Power BI role definitions; workspace visibility alone is the safe interim control, not proof of client-level row security.
12. Save the configured model/report in the governed project location. Do not commit credentials or tenant data.

### Six-page and filter acceptance checks

Use actual refreshed rows, not a rendered-but-empty visual, for each check:

1. **Executive Overview** — total reviews, average rating, sentiment shares, active complaint status, top topics, and date trend.
2. **Sentiment Analysis** — positive/neutral/negative counts and percentages; compare shares to classified reviews (unanalyzed records are excluded from the denominator).
3. **Topics & Complaints** — topic mentions and distinct review counts, complaint assignments/status/severity, product filters, and no duplicate counts from joins.
4. **Product/Campaign Comparison** — product-level review counts, ratings, sentiment, complaints, and comparison measures. Campaign is not supported by current data.
5. **Time & Trend Analysis** — UTC date keys, day/week/month grouping, date slicers, and the immediately preceding same-length period.
6. **Model Health** — successful/failed attempts, queue/latency where exposed, confidence samples, and descriptive sentiment distribution drift only when both periods have at least 30 successful samples. The current report page is specified but not yet authored; protect it as administrator-only.

Also test date, product, source, rating, sentiment, topic, and complaint filters. Verify that topic/complaint filters affect distinct review measures through the existing DAX rather than multiplying review rows. Export a sample visual and confirm it contains refreshed report data.

### Database-to-model reconciliation queries

Run these queries using the same tenant-specific reporting login as the model. Match report date, product, source, sentiment, topic, and complaint filters before comparing values.

```sql
SELECT
    count(DISTINCT review_id) AS total_reviews,
    avg(rating)::numeric(10, 4) AS average_rating
FROM reviewband_bi.fact_reviews;

SELECT sentiment, count(DISTINCT review_id) AS reviews
FROM reviewband_bi.fact_reviews
GROUP BY sentiment
ORDER BY sentiment;

SELECT
    count(*) AS complaint_assignments,
    count(DISTINCT review_id) AS complaint_reviews,
    count(DISTINCT complaint_id) FILTER (
        WHERE complaint_status <> 'resolved'
    ) AS active_complaint_categories
FROM reviewband_bi.fact_review_complaints;

SELECT
    topic.topic_name,
    count(*) AS mentions,
    count(DISTINCT fact.review_id) AS reviews
FROM reviewband_bi.fact_review_topics AS fact
JOIN reviewband_bi.dim_topics AS topic
  ON topic.organization_id = fact.organization_id
 AND topic.topic_id = fact.topic_id
GROUP BY topic.topic_name
ORDER BY mentions DESC, topic.topic_name
LIMIT 10;
```

`fact_review_complaints` is at review-to-complaint-assignment grain. The active complaint result above counts distinct non-resolved complaint categories, not individual complaint cases. `fact_review_topics` is at review-to-topic-assignment grain, so compare both mention counts and distinct review counts as appropriate.

### Power BI Service refresh and publishing

1. Publish the reviewed model and authored report to the intended governed workspace only after Desktop/model checks pass. This repository does not identify a workspace or contain publish credentials.
2. In the Power BI Service semantic model's data-source/credentials settings, provide the same dedicated PostgreSQL reporting login using the Service's secure credential store and confirm the endpoint/SSL requirements are satisfied.
3. Run an on-demand Service refresh and inspect refresh history for credential, network, and schema errors. Then schedule refresh at a cadence supported by the workspace capacity and business freshness requirement.
4. Refresh again after configuring the schedule, compare representative totals with the database queries above, and verify the report pages in the Service.
5. Grant workspace/report access only to approved users. Do not enable public/anonymous sharing. Keep the Model Health page restricted to administrators until a tested model-level role strategy separates administrator and client access.

### Freshness and limitations

The model is **Import**, not DirectQuery or real-time. Its reporting freshness is therefore:

`review submission → queued processing job → deployed worker completes analysis → next successful Power BI refresh → report reflects imported snapshot`

The source does not configure a worker deployment or a Power BI Service refresh schedule, so processing and reporting latency/frequency are currently unknown. Power BI Desktop refresh can be used manually; Service scheduled refresh must be configured after publishing. No live database reconciliation, two-tenant test, connector TLS check, model compilation, report visual validation, or publish/refresh verification has been performed from this repository environment.
