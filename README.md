# ReviewBand

ReviewBand is a React/Vite/TypeScript application with a FastAPI backend, Supabase PostgreSQL storage, and Gemini-based asynchronous review analysis. Power BI is a separate reporting client that reads tenant-scoped PostgreSQL analytics views; it does not connect through the browser or the application API.

## Power BI

The existing database reporting layer and semantic model are documented in [`powerbi/README.md`](./powerbi/README.md):

```text
Supabase PostgreSQL
  → reviewband_bi tenant-scoped views
  → dedicated read-only PostgreSQL login (one organization per login)
  → PostgreSQL connector
  → powerbi/ReviewBand.SemanticModel (TMDL, Import mode)
  → report authored from powerbi/ReportPages.md
```

The repository contains SQL migrations, TMDL semantic-model source, measure definitions, and a six-page report specification. It does not contain a PBIX/PBIP report or credentials. A published report, live connection, refresh schedule, and tenant-isolation runtime test must be verified in the target Power BI/Supabase environments; see the Power BI runbook for exact setup and reconciliation steps.

Power BI credentials belong in the Power BI credential store. Application credentials belong in server-side configuration. Only the Supabase publishable key and project URL are used by the browser; never put database passwords, Supabase secret/service-role keys, or Gemini API keys in `VITE_*` variables or source control.

## Local development

Install frontend dependencies with `npm ci`, then start Vite with `npm run dev`. The backend dependencies are listed in [`backend/requirements.txt`](./backend/requirements.txt); configure server-only values using [`backend/.env.example`](./backend/.env.example) as a template. Do not commit actual `.env` files.

The current React services under `src/services/mock/` use fixture data. This UI mock path is separate from Power BI's PostgreSQL reporting path and is not evidence of live reporting data.

## Validation commands

```sh
npm run build
npm run lint
npm run test:e2e
```

Run backend tests from the `backend/` directory in the configured Python environment:

```sh
python -m pytest
```

Apply Supabase migrations in timestamp order using the deployment's migration tool and history. Do not reapply an already-applied migration; review [`supabase/migrations/README.md`](./supabase/migrations/README.md) and the SQL validation instructions before database work.
