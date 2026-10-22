# Shared PostgreSQL database

`database/migrations/` is the only production schema history for both the Vercel web application and Render API. Runtime services verify the schema; they do not create production tables.

Apply migrations with an administrator/migration role:

```powershell
$env:DATABASE_URL="postgresql://<migration-user>:<password>@127.0.0.1:5432/papershapers_dev"
npm run db:migrate:postgres
```

Use separate runtime roles: `papershapers_web` for accounts/sessions/community data and `papershapers_api` for generated papers, attempts, feedback and cache. Local ignored environment files contain those URLs; Restricted runtime Neon credentials belong in Vercel and backend settings. Owner credentials are confined to separate trusted migration/backup sessions.

For the one-time local copy, back up the stores and run:

```powershell
$env:DATABASE_URL="postgresql://<migration-user>:<password>@127.0.0.1:5432/papershapers_dev"
python scripts/migrate_sqlite_to_postgres.py `
  --web-sqlite ".wrangler/state/v3/d1/miniflare-D1DatabaseObject/<database>.sqlite" `
  --backend-sqlite "backend/data/papershapers.db"
```

The importer is idempotent through primary/unique-key conflict handling and never overwrites newer PostgreSQL rows. It copies account records first, backend paper records second, then dependent teacher-room records. Legacy rows with missing parents are reported and skipped rather than weakening PostgreSQL constraints.

## Billing storage

Migration `0007_billing.sql` adds owner-linked `billing_orders` for prepaid memberships and voluntary contributions. Amounts are integer paise; provider order/payment identifiers are unique. Conditional writes and row locks prevent repeat grants. Grant expiry is indexed for backend queue selection. Grant web runtime SELECT/INSERT/UPDATE and backend runtime SELECT. Apply with the owner credential before enabling billing; backend startup requires its migration when enabled. Do not put card data or raw webhook payloads in this table. See `docs/BILLING_AND_MOBILE.md` for reconciliation, retention and refund limitations.

## AI budget migration
0008_llm_budget adds a single shared provider-call reservation row, updated atomically across workers. Backend requires SELECT/INSERT/UPDATE. Daily account admission uses existing 0005_request_limits with web runtime grants regardless of the optional burst flag. See docs/AI_COST_CONTROLS.md.


Migration 0009 adds independent marketplace notice, review-audit, and report tables. Public reads use the Next.js PostgreSQL adapter; Study tables and the Python catalogue are unaffected.

Migration 0010 adds bounded compressed WebP bytea media, approximate H3 location and AI review provenance. Existing notices without coordinates remain area-searchable. Runtime/operator grants and preview Neon branch isolation are described in docs/VERCEL_MIGRATION.md. Do not store original image EXIF or viewer location history.

Migration 0011 adds partial indexes over approved public notice recency and pending/running Study jobs. The runtime pool defaults to one connection and search returns at most 51 notice bodies. The resource plan documents image limits, idle compute and production load checks.

Migration 0012 adds marketplace reservation opt-in, deduplicated engagement and reservation records, and a user-history index. Hosted web runtime receives SELECT/INSERT/UPDATE only on the new tables. Rows reference notices/accounts with cascading deletion; include both tables in verified deletion/retention operations. Apply the additive migration before the new web release.

Migration 0013 adds nullable structured state/city, validated preset categories (0–3, allowing older writers during rollout), backfills primary category for existing notices, and adds a public region index. New web writes include the primary category, then validated review labels. No new table privileges are needed beyond the existing notice SELECT/INSERT/UPDATE grants. No demo seed data is migrated.

## Current release workflow
Run the JS migration command in a trusted operator/CI step using MIGRATION_DATABASE_URL (direct owner connection); it now honors that value, serialises runners and commits atomically. Current migrations are idempotent/reapplied, so review schema locking before release. Apply restricted runtime grants separately. Do not place the owner URL in the Vercel project. Vercel prebuild performs read-only configuration/schema checks instead of migration/grant writes. Presence checks do not replace actual grant/restore acceptance.
