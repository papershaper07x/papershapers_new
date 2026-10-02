# Paper Shapers local runbook

## PostgreSQL migration

The web application now requires `DATABASE_URL`. FastAPI uses PostgreSQL when it is configured and retains SQLite only for isolated tests. Apply `npm run db:migrate:postgres` before starting either service. See [database/README.md](database/README.md) for runtime roles and the one-time D1/SQLite copy. Never commit a connection string.

This repository is self-contained in `C:\papershapers`. Local development does not depend on the hosted copy and none of the commands below publish to a cloud service. Standard Next.js and FastAPI connect to the local PostgreSQL database through separate least-privilege runtime roles.

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7+
- Node.js 22.13 or newer
- npm (included with Node.js)
- Python 3.11 or newer
- PostgreSQL 15 or newer

## First run

```powershell
cd C:\papershapers
powershell -ExecutionPolicy Bypass -File .\run.ps1 setup
powershell -ExecutionPolicy Bypass -File .\backend.ps1 setup
powershell -ExecutionPolicy Bypass -File .\backend.ps1 run
```

Keep that terminal open, then start the web app in another terminal:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1 dev
```

Open `http://localhost:3000`. The routes are:

| Product | Local URL |
| --- | --- |
| Umbrella home | `http://localhost:3000/` |
| Study Lab | `http://localhost:3000/papershapers` |
| Perspective | `http://localhost:3000/perspective` |
| Noticeboard | `http://localhost:3000/noticeboard` |

Stop the server with `Ctrl+C`.

Apply the shared migration before first run, then create a local account at `http://localhost:3000/auth`. Runtime services verify the schema and do not create production tables.

## Runner commands

```powershell
.\run.ps1 setup  # install or refresh dependencies
.\run.ps1 dev    # install when needed, then start the local server
.\run.ps1 lint   # static code checks
.\run.ps1 build  # production build without deployment
.\run.ps1 test   # production build plus structural tests
.\run.ps1 check  # lint, build, and tests
.\backend.ps1 test    # backend-only tests
.\backend.ps1 batch   # load bundled illustrative news
.\backend.ps1 health  # inspect a running backend
```

Edit `backend/.env` to configure Gemini. `GEMINI_API_KEYS` accepts a comma-separated development key ring: each request starts at the next key and retries the remaining keys only after a failure. Gemini is the only active paper-generation provider and the API fails without saving a paper if every key cannot return a valid response. `ALLOW_MOCK_FALLBACK` stays false for actual runs. Root `config/local.example.env` documents web-to-backend variables. Never paste provider keys into source files or `NEXT_PUBLIC_*` values.

Google sign-in is optional locally. Copy the three `GOOGLE_*` values from `config/local.example.env` into `.env.local`, create a separate Google Web OAuth client for local use, and register `http://localhost:3000/api/auth/google/callback` exactly. The button remains hidden until all three values are present. Production setup, security behaviour, and final-domain callback testing are in [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md).

If the current PowerShell policy blocks scripts, prefix the command with `powershell -ExecutionPolicy Bypass -File`, as shown in First run.

## Change workflow

1. Read the root README, `docs/SYSTEM_DESIGN.md`, and the README inside the portal being changed.
2. Keep shared chrome and design tokens in `app/components` or `app/globals.css`; keep product behaviour in its portal folder.
3. Update the relevant portal README for product or flow changes.
4. Update `docs/SYSTEM_DESIGN.md` for architecture, persistence, security, or deployment changes.
5. Add a concise entry to `CHANGELOG.md` for user-visible or operational changes.
6. Run `.\run.ps1 check` before handing off the work; it includes backend tests.
7. Review important UI work near 390 px, 768 px, and 1440 px widths.

## Hosting handoff

The selected production target is Netlify for Next.js, Render for FastAPI, and Neon for PostgreSQL. Hosting is intentionally not embedded in `run.ps1`; publishing is an explicit, separately reviewed action.

Production checklist:

1. Create Neon preview and production databases and apply `database/migrations/` using a migration role.
2. Deploy Render from `backend/Dockerfile`; set its Neon `DATABASE_URL`, model keys, CORS origin and shared service secret.
3. Deploy the standard Next.js application to Netlify; set its web-role `DATABASE_URL`, Render `BACKEND_ORIGIN`, matching service secret and Google OAuth values.
4. Configure the four `NEXT_PUBLIC_*_ORIGIN` values and final Google callback URL.
5. Confirm production cookies are `Secure`, `HttpOnly`, and `SameSite=Lax`; use a parent-domain cookie only when the final subdomain design requires it.
6. Exercise signup, Google login, logout, generation, paper history, attempts and teacher rooms against a non-production account.

The complete console-by-console procedure and network rules are in [docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md](docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md).

Read [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md) before any public launch. It lists the unresolved dependency audit, distributed rate limiting, deletion, minor/school, source-rights, moderation, and host-migration work that a build command cannot verify.

Secrets belong in the selected hosting platform, never in this repository or browser-delivered code.

## Troubleshooting

- **Node version error:** install Node.js 22.13+ and reopen the terminal.
- **Port 3000 is occupied:** stop the other local server, then rerun `dev`.
- **Stale dependency error:** run `.\run.ps1 setup`, then `.\run.ps1 check`.
- **Build succeeds but a route looks wrong:** verify the exact route above and inspect that portal's README for its intended state.
- **Generation says Gemini is unavailable:** add one or more fresh comma-separated values to `GEMINI_API_KEYS` in `backend/.env` and restart the backend. Do not reuse a key embedded in an imported legacy project.
- **Backend unavailable in the UI:** run `.\backend.ps1 health`, confirm port 8000 is free, and check `BACKEND_ORIGIN`.
