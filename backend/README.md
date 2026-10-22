# Local backend

This directory is the independently deployable FastAPI service. It uses PostgreSQL whenever `DATABASE_URL` is configured and retains SQLite as an isolated test fallback. Production targets Render with Neon PostgreSQL. The configurable language-model router is server-only and does not depend on copied legacy projects.

## Run locally

```powershell
.\backend.ps1 setup
.\backend.ps1 run
```

The API listens on `http://127.0.0.1:8000`. In a second terminal run the web application with `.\run.ps1 dev`. The web server proxies browser requests to the API, so provider credentials never enter client JavaScript.

Useful commands:

```powershell
.\backend.ps1 test
.\backend.ps1 health
```

## Configuration

Neon pooled runtime URLs are supported. The database adapter applies its 10-second statement timeout with `SET LOCAL` inside each transaction, rather than sending unsupported startup options to the pooler. Keep using the restricted runtime role; this fix does not require changing database credentials.

`backend/.env.example` is the complete configuration contract. `backend/.env` is local-only and ignored by Git.

- `LLM_PROVIDER_ORDER=gemini,groq,nvidia` controls the explicit real-provider sequence. Only configured providers are contacted. A request starts with the first provider and moves to the next only after every key in the current provider's ring fails. This is deterministic fallback, not an agent loop.
- `GEMINI_API_KEYS`, `GROQ_API_KEYS`, and `NVIDIA_API_KEYS` each accept one key or a comma-separated local development key ring. Each provider rotates its starting slot and retries its remaining slots after a failure. The singular `*_API_KEY` names are accepted as compatibility aliases. Model names live in `GEMINI_MODEL`, `GROQ_MODEL`, and `NVIDIA_MODEL`.
- `STUDY_GENERATION_CACHE_HOURS` sets the expiry of an identity-free, validated paper cache entry. The cache is written after a successful real generation and read **only** after every configured provider fails. It never shares a paper ID, account, response, attempt, or score. `STUDY_GENERATION_CACHE_VERSION` is part of the cache fingerprint; change it when paper prompting or source data changes materially.
- `ALLOW_MOCK_FALLBACK=false` is the default: actual runs fail clearly when no configured model returns a valid structured paper. Set it to `true` only for automated tests or isolated UI work.
- `BACKEND_SHARED_SECRET` is required for every private Study paper route (create, retrieve, attempt, result, and feedback). Use the same high-entropy value in `backend/.env` and the root `.env.local`; do not expose it to the browser.
- `BACKEND_ALLOWED_ORIGINS` scopes direct browser access; normally the browser uses same-origin web proxies.
- `STUDY_CURRICULUM_CSV_PATH` points to the existing local Paper Shapers chapter-content data. The catalog and generation request both validate class, subject, and chapter values against that source; associated local paper-setting guidance is supplied to the model when available.

Copy matching non-public values into a root `.env.local` as `BACKEND_ORIGIN` and `BACKEND_SHARED_SECRET`. Never put model keys in a `NEXT_PUBLIC_*` variable.

### Provider setup and response contract

Create keys in the provider account consoles; do not paste them into source files, issue trackers, or the browser. The backend never returns them, logs them, or sends them to client JavaScript.

| Provider | Key variable | Default model | API response accepted by the router |
| --- | --- | --- | --- |
| Gemini | `GEMINI_API_KEYS` | `gemini-2.5-flash` | Gemini `generateContent` JSON, with text extracted from candidate parts |
| Groq | `GROQ_API_KEYS` | `openai/gpt-oss-20b` | OpenAI-compatible `choices[0].message.content` JSON text |
| NVIDIA NIM | `NVIDIA_API_KEYS` | `nvidia/nemotron-3-super-120b-a12b` | OpenAI-compatible `choices[0].message.content` JSON text |

All providers receive the same bounded source-context prompt and must return a JSON object. The Groq adapter uses JSON mode with hidden reasoning tokens and an 8,192-token completion ceiling so its response remains parseable while leaving room for a full paper. The Study service normalises a section-grouped paper when possible, then requires question IDs, question text, answer outlines, numeric marks, and the requested timing/total before it saves anything. A response that fails this validation is treated as a failed provider result, so the router can try the next configured key or provider; it is never shown or persisted. It does not use a template or mock paper in a normal run.

Use the provider's dashboard to create a personal development key and check its live rate limits. Free access is account-, region-, model-, and quota-dependent, so the router treats rate limits, model removal, and timeouts as provider failures rather than promising a provider will always be free. Gemini documents free-tier access and per-project limits; NVIDIA documents developer-program prototype access; Groq's current models and limits are shown in its console. See [Gemini billing](https://ai.google.dev/gemini-api/docs/billing), [Gemini rate limits](https://ai.google.dev/gemini-api/docs/rate-limits), and [NVIDIA NIM quickstart](https://docs.api.nvidia.com/nim/re/docs/api-quickstart).

## Current routes

| Route | Purpose | Persistence |
| --- | --- | --- |
| `GET /health` | API, database, and configured provider status | none |
| `POST /v1/study/papers` | Generate a half (40 mark) or full (80 mark) structured paper, with recovery-only cache | `generated_papers`, `generated_paper_cache` |
| `GET /v1/study/papers?user_id=…` | Paper history for the authenticated web user | read-only |
| `GET /v1/study/catalog` | Installed class/subject/chapter catalog from local source data | none |
| `GET /v1/study/papers/:paperId?user_id=…` | Owner-scoped full paper view | `generated_papers` |
| `POST /v1/study/papers/:paperId/attempts` | Store responses and create formative feedback | `paper_attempts` |
| `GET /v1/study/papers/:paperId/attempts/:attemptId?user_id=…` | Owner-scoped formative result | `paper_attempts` |
| `GET /v1/marketplace/listings` | Area/interest/freshness-ranked illustrative listings | `marketplace_listings` |

PostgreSQL is the normal local and hosted persistence layer. SQLite remains only for isolated backend tests. Slow generation/ingestion should move behind a job queue as traffic grows; route schemas can remain stable.

## Render deployment boundary

`backend/Dockerfile` is the production container boundary and accepts Render's `PORT` value. The repository root must be used as its Docker build context. Do not deploy it with SQLite: the free instance filesystem is ephemeral. Follow [the deployment runbook](../docs/production/02-vercel/README.md).

Render receives LLM keys, `DATABASE_URL`, and `BACKEND_SHARED_SECRET`. It must never receive Google OAuth credentials. Vercel calls the API server-to-server; normal browsers never call the Render URL directly. Free instances sleep after 15 minutes and have an ephemeral filesystem, so the UI must handle cold starts and Neon must own every persistent record.

## Safety and product limits


For Study attempts, model-assisted feedback is accepted only when every generated question ID is present, every score is numeric, and no score exceeds that question's mark cap. Otherwise the API returns the local practice rubric. This protects result shape and mark bounds; it does not independently certify an academic answer as correct.





## Student assessment hardening — 9 October 2026

Production assessment validates question IDs, numeric finite scores and paper mark caps within the provider retry chain. Invalid reviews fail with 503; duplicate or unknown submitted IDs fail with 422. No production completeness-based fallback is saved. Explicit offline mock mode is still test-only. Question text and options accompany assessment context, and responses are treated as untrusted answers. `/version` returns the Render source commit and release label. See `docs/STUDENT_PLATFORM_AUDIT.md` for remaining persistence, job and readiness limits.

## Question diagrams
Generation accepts bounded version-1 diagram specifications and retries invalid output before persistence. Section normalization, generation cache keys, assessment prompts and review snapshots preserve diagrams. See `docs/QUESTION_CONTENT.md`; existing JSON storage needs no migration.

## Missing PostgreSQL migrations at startup

## Active API
The backend serves Study and marketplace routes only. Startup no longer requires retired pipeline migrations or seeds feed fixtures. Run `backend.ps1 migrate` using an owner credential to apply the one-time `0006_retire_portal.sql` cleanup on existing installations. Limited runtime credentials cannot drop owner-managed tables.

## Paper generation jobs
`POST /v1/study/generation-jobs` queues a validated brief and returns 202. `GET /v1/study/generation-jobs/{id}?user_id=...` returns queued/generating/ready/failed and requires the shared secret. Next.js supplies the signed-in user ID. A lifespan worker processes one generation at a time per API process, with a 240-second execution budget and 300-second recovery lease. Deploy the backend before the frontend; retain the synchronous paper endpoint for existing clients.
Jobs use existing `generated_papers` columns, so no owner migration is needed. They stay out of paper readers, archives and assessment until status becomes generated. Graceful shutdown releases claims; a crash leaves a lease that can be reclaimed. Completed output replaces the queued brief at the same ID. Failed records remain private for diagnosis; logs include exception types without provider credentials or student content.

## Board mock draft lifecycle
Board profiles are versioned in board_profiles.py. Only CBSE 2026–27 Maths (041) at X Standard / XII is supported. Queue admission checks complete source coverage. Board jobs have a 900-second model budget and a 960-second crash recovery lease; the planner polls for up to 20 minutes. They reuse existing paper JSON storage, with no schema migration. Completed paper JSON retains source hashes/chunk offsets, private worked solutions and per-step marking. Public paper/history responses redact grading fields recursively. Submission binds structured OR choices to one selected rubric and carries case-study parts into assessment. Formative scores remain model reviews.

Operator export: `python backend/scripts/export_board_review.py --paper-id ID --user-id OWNER --output work/review.json`. This reads a private local/operator database and includes answer material; it is not a student download. Have an educator inspect complete papers, keys, subparts, alternatives, figures and timing. The export never changes review status. No reviewed or official-exam claim is made before that human work.

## Optional paid queue priority

Apply owner migration `0007_billing` before setting `BILLING_ENABLED=true`. The migration runner grants the configured backend runtime SELECT on `billing_orders`; Razorpay keys belong only to the web runtime. The queue checks paid unexpired membership grants from the database. Paid recent jobs precede free recent jobs, while jobs older than ten minutes rank first by age to prevent starvation. Running jobs are not preempted; provider latency and limits do not change. Contributions never grant priority. Keep the backend/web feature flags coordinated. See `docs/BILLING_AND_MOBILE.md`.

## Provider-call safety
Apply 0008_llm_budget and backend runtime grants before restart. Each outgoing call reserves shared persistent daily/monthly allowance, including failed keys and all providers. Defaults: 20/day, 100/month, two attempts per router invocation, 8192 output tokens and 60000 input characters. Set LLM_ENABLED=false to pause new router calls. See docs/AI_COST_CONTROLS.md; counts are not a currency spending guarantee.


## Runtime tracing
The API logs JSON request status/duration under random request IDs; only the authenticated web service can propagate its own reference. Queue envelopes retain it through restarts. Worker and provider events include outcomes, durations and reported numeric usage. Use --no-access-log for Uvicorn; HTTPX URL logs are suppressed. Logs go to stdout, not the student database or a public endpoint. See docs/OBSERVABILITY.md.

## Marketplace review
POST /v1/marketplace/review uses the existing configured router and budgets. Strict review schema rejects uncertain/flagged/malformed approvals and disallows mocks. Text prefers configured Groq; images use Gemini inline WebP. Service authentication is required. See docs/MARKETPLACE_LAUNCH.md. Vercel migration applies to the Next frontend; keep this persistent worker service as-is until the Study queue is deliberately redesigned.

## Resource defaults
Use one API/worker process for the pilot. Idle Study polling backs off to ten minutes with immediate same-process enqueue wakeup; review concurrency is one with an 18-second deadline. PostgreSQL connection/statement timeouts are ten seconds; connections close after transactions. Details and free-host sleep tradeoffs: docs/RESOURCE_PLAN.md.

## Production audit
The Vercel migration does not move the persistent worker into web functions. Keep one backend process initially and validate pooled Neon connectivity, approved curriculum packaging/licensing, ALLOW_MOCK_FALLBACK=false, service authentication, provider quotas, restore and deployed memory. /version now labels the production-audit release; compare its commit with the web Vercel SHA during staging. Owner DB credentials belong in a separate migration step, never ordinary web functions. See docs/production/README.md.
