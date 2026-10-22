# Paper Shapers

Current production handoff: **22 October 2026**. One Next.js application contains core Home, Study and Nearby. The current target is **Vercel (web) + existing FastAPI worker service + Neon PostgreSQL**. No Netlify build adapter or migration path is required. Follow the Vercel guide below.

## Start here

- [Production launch handbook](docs/production/README.md): ordered development, deployment, operations, SEO, marketing, ads and growth steps.
- [Production audit and open launch gates](docs/PRODUCTION_AUDIT.md): what is implemented, verified, unresolved and externally dependent.
- [Local verification evidence](docs/MARKETPLACE_TEST_REPORT.md): deterministic tests, browser checks and their limits.
- [Marketplace business decisions](docs/MARKETPLACE_BUSINESS_MODEL.md): zero commission, direct discovery, honest activity signals and planned funding.

A local green build does not certify production readiness. Commercial hosting eligibility, actual Neon roles/restore, TLS/OAuth, provider safety, legal/operator arrangements and deployed acceptance remain required. No deployment, DNS change, ad activation or purchase is implied by this README.

## Products and stable URLs

| Host                        | Root behavior              | Stable product routes    |
| --------------------------- | -------------------------- | ------------------------ |
| papershapers.in             | Core homepage              | /                        |
| study.papershapers.in       | Internal rewrite to Study  | /papershapers, /syllabus |
| marketplace.papershapers.in | Internal rewrite to Nearby | /noticeboard             |

The shared logo returns to core Home; portal navigation stays inside that portal. Public browsing is allowed. Study private work, teacher hosting, marketplace posting, saving, reporting and reservations use the appropriate account/session checks. Student room entry has its own scoped attendee flow.

One shared identity supports password sessions and Google OAuth. Production sibling domains sharing cookies must all be trusted. Exact Google callback URLs must be configured for every actual hostname. Provider secrets never reach browser code.

## Implemented behavior

Study includes class/subject/chapter planning, private queued paper generation, attempts/formative feedback, teacher rooms, published editorial/Journal pages and optional gated billing/mobile installation. Generated content is practice support, not official CBSE material or certified marking. Journal submissions remain pending until operator publication.

Nearby includes India state/city presets and custom towns, category/keyword search, optional approximate H3 distance filtering, reviewed text/compressed images, private pending submissions, owner withdrawal, reports/blocks and one-person free reservation requests. Organisers confirm or decline; visitor updates live in the dashboard. There is no email/SMS/push delivery, ticket guarantee or venue payment handling. Public engagement counts represent account actions, not verified humans or footfall. Dummy previews are labelled and non-bookable.

The marketplace charges no transaction commission or reservation request fee. Venue charges and taxes can apply. Third-party ad scripts are off; ads.txt requires a real configured publisher ID. Study Plus is separate. New paid checkout and advertising need their own acceptance gates. No fee-based Buy Me a Coffee integration was enabled under the free-only requirement.

## Local development

Use Node 22.13+ and Python 3.11+. Follow [the development steps](docs/production/01-development/README.md) and [RUNBOOK.md](RUNBOOK.md).

```powershell
npm ci
# Configure ignored .env.local and backend/.env from the examples.
# Install backend/requirements.txt in the project's Python environment.
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log
# In another terminal:
npm run dev
```

Windows wrappers are run.ps1 and backend.ps1. Normal dev URL is http://localhost:3000. The Python backend needs its approved curriculum source; see [backend/README.md](backend/README.md). Its Docker image includes data/curriculum_store.sqlite; verify availability/licensing and actual reader behavior before release. Large source CSVs/instructions, downloaded PDFs and private runtime stores remain outside the web deployment.

Use PostgreSQL for persisted application data. SQLite is an offline backend test adapter; PGlite is a disposable integration-test database, not production persistence.

## Database and deployment

Use a separate Neon branch for preview. Apply migrations through 0013 with an operator/direct credential, then grant restricted runtime roles. The migration runner prefers MIGRATION_DATABASE_URL, serialises runners and commits atomically. Reapplied idempotent migrations can still take schema locks; review maintenance timing.

```powershell
# Inject the owner credential only into this trusted operator/CI step.
npm run db:migrate:postgres
# Remove owner credentials before invoking a Vercel build/deployment.
```

Do not place MIGRATION_DATABASE_URL in the Vercel project. Its prebuild now validates configuration and existing schema without mutations. Ordinary project variables can reach both build and runtime. All hosted schema mutations are separate operator/CI steps; there is no legacy host build path.

Production public navigation values are:

```dotenv
NEXT_PUBLIC_HOME_ORIGIN=https://papershapers.in
NEXT_PUBLIC_STUDY_ORIGIN=https://study.papershapers.in/papershapers
NEXT_PUBLIC_MARKET_ORIGIN=https://marketplace.papershapers.in/noticeboard
```

Use a pooled restricted DATABASE_URL, DATABASE_POOL_MAX=1, actual HTTPS BACKEND_ORIGIN, matching high-entropy BACKEND_SHARED_SECRET, REQUEST_LIMITS_ENABLED=true and MARKETPLACE_ENABLED=true. Preview also requires an actually isolated database and PREVIEW_DATABASE_ISOLATED=true. Full variables, grants, domains and rollback steps are in [the deployment README](docs/production/02-vercel/README.md).

Keep the persistent Python worker on its current service. Free services can sleep and lack the availability/backup guarantees required by some launches. Vercel Hobby is personal/non-commercial: choose commercial-eligible hosting before this business goes public. Do not assume distributing services across free plans removes those terms or operating costs.

## Verify changes

```powershell
npm run lint
npm test
npm run backend:test
npm run audit:deployment
npm run test:e2e:marketplace
```

`npm test` includes the required production build. The end-to-end runner uses an isolated local database and stubbed AI transport. Run it after building. Stop production previews before modifying their .next output. Production Turbopack filesystem caching is disabled after a reproduced stale PostCSS issue; a regression test verifies new responsive styles reach build artifacts.

The deployment trace audit checks a 200 MiB review budget and private/backend material; local Windows traces do not prove Linux/Vercel bundle size or hosted RSS. Real device, provider, Neon concurrency/grant/restore and payment acceptance remain separate gates.

## Repository map

| Path                             | Responsibility                                                    |
| -------------------------------- | ----------------------------------------------------------------- |
| app/components, app/globals.css  | Shared brand, layout and responsive styles                        |
| app/papershapers, app/syllabus   | Study, Journal, curriculum, rooms and private workflows           |
| app/noticeboard                  | Nearby discovery, posting, details and local desk                 |
| app/api                          | Same-origin web adapters and authenticated mutations              |
| backend/app                      | FastAPI generation, queue, judge and provider budgets             |
| db, database/migrations          | PostgreSQL adapter, service contracts and additive schema         |
| scripts                          | Migration, preflight, moderation, packaging and isolated tests    |
| mobile/android, public/downloads | Deliberate Android source/public signed artifact; no private keys |
| docs/production                  | Current launch, promotion, monetisation and growth instructions   |

Additional references: [system design](docs/SYSTEM_DESIGN.md), [resource bounds](docs/RESOURCE_PLAN.md), [database](database/README.md), [Study](app/papershapers/README.md), [Nearby](app/noticeboard/README.md), [billing](docs/PAYMENT_ACTIVATION.md), [observability](docs/OBSERVABILITY.md), and [Vercel deployment](docs/production/02-vercel/README.md).
