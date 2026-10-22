# Vercel migration guide

Current guide, updated 22 October 2026: [Vercel + Neon deployment README](production/02-vercel/README.md). Begin with the [complete launch handbook](production/README.md) and [production audit](PRODUCTION_AUDIT.md).

## Important correction to earlier instructions

Do not store MIGRATION_DATABASE_URL as an ordinary Vercel project variable. Such variables can be available to runtime functions as well as builds. Run migrations and grants in a separate trusted operator/CI step, then deploy using only the restricted runtime DATABASE_URL. Vercel prebuild now validates configuration and existing schema; it does not mutate tables or grant privileges. Netlify configuration and its build-time mutation path have been removed. The deployment guide includes account, DNS and repository integration retirement steps.

Apply all migrations through 0013 to the actual isolated preview database, then verify roles and acceptance before production. The migration runner now honors the separate owner URL and commits atomically. PREVIEW_DATABASE_ISOLATED=true does not itself create/prove branch isolation.

The public hosts are papershapers.in, study.papershapers.in and marketplace.papershapers.in. Navigation bases retain /papershapers and /noticeboard suffixes. Vercel Hobby is not the commercial launch plan for this product. No paid plan, live deployment, DNS change, shared DB migration or advertising activation was performed by the audit.

The current guide includes full environment configuration, runtime grants, body/bundle limits, backend worker separation, domain/OAuth cutover, preview protection, billing/ads gates and rollback. Earlier migration notes are superseded wherever they conflict with that guide.
