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
.\backend.ps1 batch
.\backend.ps1 health
```

## Configuration

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
| `GET /v1/news/articles` | Normalized news catalogue | `news_articles` |
| `POST /v1/news/analyze` | Three clearly labelled editorial lenses | `news_perspectives` |
| `POST /v1/news/batch` | Fixture or configured RSS ingestion | news tables |
| `GET /v1/marketplace/listings` | Area/interest/freshness-ranked illustrative listings | `marketplace_listings` |

PostgreSQL is the normal local and hosted persistence layer. SQLite remains only for isolated backend tests. Slow generation/ingestion should move behind a job queue as traffic grows; route schemas can remain stable.

## Render deployment boundary

`backend/Dockerfile` is the production container boundary and accepts Render's `PORT` value. The repository root must be used as its Docker build context. Do not deploy it with SQLite: the free instance filesystem is ephemeral. Follow [the deployment runbook](../docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md).

Render receives LLM keys, `DATABASE_URL`, and `BACKEND_SHARED_SECRET`. It must never receive Google OAuth credentials. Netlify calls the API server-to-server; normal browsers never call the Render URL directly. Free instances sleep after 15 minutes and have an ephemeral filesystem, so the UI must handle cold starts and Neon must own every persistent record.

## Safety and product limits

Generated study answers require educator review. Study generation does not save a template paper when a provider is unavailable or returns invalid JSON. When every configured real provider is unavailable, it may create a new owner-scoped copy of an unexpired matching validated cache entry; otherwise it returns an error. News lenses are analysis drafts, not verified reporting, and must retain source links plus human editorial review before publication. Marketplace data is illustrative until verification, moderation, reporting, and expiry jobs exist. The API never logs model credentials or returns provider error bodies.

For Study attempts, model-assisted feedback is accepted only when every generated question ID is present, every score is numeric, and no score exceeds that question's mark cap. Otherwise the API returns the local practice rubric. This protects result shape and mark bounds; it does not independently certify an academic answer as correct.
