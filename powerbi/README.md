# ReviewBand Power BI

Power BI is the separate business-intelligence/reporting layer. React remains the product UI; Power BI connects directly to Supabase PostgreSQL and never reads the React app or calls the AI provider.

## Source and connection

Use Power BI Desktop's built-in **PostgreSQL database** connector against the Supabase PostgreSQL database, not the Supabase REST URL. Configure the project database host, port, and database name (normally `postgres`) from Supabase's Connect settings; the model's `PbiServer` parameter expects `host:port`. Require TLS/SSL in the connector credentials and use Power BI Import mode with scheduled refresh for the initial deployment. DirectQuery may be evaluated separately against real workload and connector limitations.

After applying all migrations in order through `20261004004000_power_bi_analytics.sql`, connect to the `reviewband_bi` schema and load the views listed below. Use a dedicated database login for exactly one organization. Never put a database password, Supabase secret/service-role key, or Gemini API key in this repository, Power Query source, PBIP parameters, or a report.

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
