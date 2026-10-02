# Netlify + Render + Neon deployment runbook

This is the selected zero-cost experimental architecture. Do not deploy the current branch until both migration gates below are complete.

## Repository ownership

Use one GitHub repository and one production branch. Netlify deploys the web unit, Render deploys `backend/Dockerfile`, and Neon hosts the shared PostgreSQL schema. One repository keeps API and database contract changes on the same reviewed commit.

```text
papershapers/
  app/ lib/ db/ public/ worker/   current web unit (target: frontend/)
  frontend/                       web boundary and future Netlify root
  backend/                        FastAPI service and Render Dockerfile
  drizzle/                        current D1 migrations (target: database/migrations/)
  docs/                           architecture and operator runbooks
  config/                         committed examples only; never credentials
```

Target layout after migration:

```text
frontend/              Next.js UI, same-origin API routes, auth
backend/               stateless FastAPI generation/evaluation service
database/migrations/   one reviewed PostgreSQL schema history
docs/                   product, security, privacy, and operations
```

## Migration status and remaining gates

1. **Implemented locally:** shared PostgreSQL migration, standard Next.js web adapter, dual PostgreSQL/SQLite FastAPI adapter, separate local runtime roles, and an idempotent D1/SQLite copy utility.
2. **Before deployment:** create Neon roles, run the migration/copy against a disposable Neon branch, complete owner-isolation tests, and configure preview credentials.
3. **Workspace cleanup:** physically move the verified web unit into `frontend/` and set Netlify's base directory there.

## Five consoles, in order

### 1. GitHub

1. Protect `main` and deploy only reviewed commits.
2. Keep `.env.local`, `backend/.env`, curriculum inputs, SQLite files and reference archives ignored.
3. Enable dependency/security alerts and require build and test checks.
4. Never store provider, OAuth, Neon, Render or shared-secret values in source.

### 2. Neon

1. Create one free project close to the majority of users and, if possible, the selected Render region.
2. Create separate least-privilege application and migration roles; the runtime roles must not own the database.
3. Put the pooled `DATABASE_URL` only in Netlify and Render server settings.
4. Run committed migrations as an explicit release step, not from every request.
5. Export regularly and test restoration; free services provide no application SLA.

### 3. Render

1. In Render, select **New → Web Service** and connect the GitHub repository.
2. Select **Docker**, use the repository root as build context, and set the Dockerfile path to `backend/Dockerfile`.
3. Select the free instance and a region near Neon.
4. Set `/health` as the health-check path. Do not use an uptime pinger to defeat the 15-minute free-tier sleep policy.
5. Add only backend secrets: `DATABASE_URL`, `BACKEND_SHARED_SECRET`, provider key rings, model names, cache settings and curriculum configuration.
6. Do not add Google OAuth secrets to Render. The API trusts the authenticated Netlify server through the shared backend credential.
7. Expect the first request after sleep to take about a minute to wake. The Netlify UI must show a clear waking message and retry only safe/idempotent operations.

Render's free filesystem is ephemeral. SQLite, uploaded files and generated papers must never be treated as persistent production storage. Do not use Render's free PostgreSQL for this project because it expires after 30 days; Neon is the source of truth.

### 4. Netlify

1. Connect the same GitHub repository only after the Netlify runtime gate passes.
2. Configure the migrated `frontend/` directory as the project base and use its verified Next.js build settings.
3. Add server-only values: `DATABASE_URL`, `BACKEND_ORIGIN`, `BACKEND_SHARED_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`.
4. Give previews separate data and OAuth callbacks. Never give untrusted previews production credentials.
5. Keep the free-plan hard limit enabled and verify the complete paper lifecycle before production promotion.

### 5. Google OAuth

1. Add `https://<production-domain>/api/auth/google/callback` exactly.
2. Keep localhost as a separate development callback.
3. Enable preview callbacks only when preview authentication is intentional.
4. Configure the consent screen, verified domain, privacy policy, terms and only `openid`, email and profile scopes.
5. Rotate any OAuth secret previously pasted into chat or another non-secret channel.

## Network and secret boundaries

| Connection | Authentication | Rule |
| --- | --- | --- |
| Browser → Netlify | HTTP-only session cookie | Generation routes reject signed-out users. |
| Netlify server → Render | `X-Backend-Secret` over HTTPS | Never expose the header or call from client JavaScript. |
| Netlify server → Neon | TLS + least-privilege web role | Accounts, sessions and web-owned data only. |
| Render → Neon | TLS + least-privilege API role | Papers, attempts, feedback and recovery cache. |
| Render → LLM providers | Provider keys over HTTPS | Remove student identity from prompts and logs. |
| Browser → Render | Unsupported | Direct private-route calls fail without the shared secret. |

`/health` may be public but must reveal only coarse readiness—never database URLs, provider errors, keys, user data or filesystem paths.

## Release checks

1. Run `npm run build`, `npm test`, and `npm run backend:test`.
2. Run PostgreSQL migrations and owner-isolation tests against a disposable database.
3. Deploy Render and verify `/health` plus one authenticated server-to-server generation.
4. Deploy a Netlify preview with preview-only credentials.
5. Test login, cold-start messaging, paper generation, idempotent retries, persistence after API restart, evaluation, archive and deletion.
6. Promote the same reviewed commit and record it in `CHANGELOG.md`.
