# Paper Shapers local runbook

This repository is self-contained in `C:\papershapers`. Local development does not depend on the hosted copy and none of the commands below publish to a cloud service. The Cloudflare Vite plugin runs a local Worker and a persistent local D1 simulation under `.wrangler/state`.

## Prerequisites

- Windows PowerShell 5.1 or PowerShell 7+
- Node.js 22.13 or newer
- npm (included with Node.js)
- Python 3.11 or newer

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

The first sign-up initializes the local tables automatically. Create a local account at `http://localhost:3000/auth`; it is stored only in the local Miniflare D1 database.

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

The selected production target is Cloudflare Workers + D1 because the same Worker runtime and binding APIs run locally, D1 has a free plan, and one deployment can serve several custom subdomains. Hosting is intentionally not embedded in `run.ps1`; publishing is an explicit, separately reviewed action.

Production checklist:

1. Create a production D1 database and bind it as `DB`.
2. Apply every SQL migration in `drizzle/` to production in numeric order before accepting accounts. Runtime `CREATE TABLE IF NOT EXISTS` remains a safety net, not the desired release process.
3. Configure the four `NEXT_PUBLIC_*_ORIGIN` values documented in the root README.
4. Attach `papershapers.in`, `learn.papershapers.in`, `news.papershapers.in`, and `nearby.papershapers.in` as Custom Domains on the same Worker.
5. Confirm cookies are issued with `Domain=.papershapers.in`, `Secure`, `HttpOnly`, and `SameSite=Lax`.
6. Deploy the Python sidecar to a container-capable host, replace SQLite with managed storage before multi-instance scaling, and set the web runtime's `BACKEND_ORIGIN` and matching shared secret.
7. Exercise signup, login, logout, paper generation/history, news ingestion/lenses, listing ranking, preferences, and saved items against a non-production test account.

Netlify or Firebase could host a separately adapted build, but either choice introduces a second runtime/data integration. They are not the baseline while this application relies on Worker hostname routing and D1 bindings.

Read [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md) before any public launch. It lists the unresolved dependency audit, distributed rate limiting, deletion, minor/school, source-rights, moderation, and host-migration work that a build command cannot verify.

Secrets belong in the selected hosting platform, never in this repository or browser-delivered code.

## Troubleshooting

- **Node version error:** install Node.js 22.13+ and reopen the terminal.
- **Port 3000 is occupied:** stop the other local server, then rerun `dev`.
- **Stale dependency error:** run `.\run.ps1 setup`, then `.\run.ps1 check`.
- **Build succeeds but a route looks wrong:** verify the exact route above and inspect that portal's README for its intended state.
- **Generation says Gemini is unavailable:** add one or more fresh comma-separated values to `GEMINI_API_KEYS` in `backend/.env` and restart the backend. Do not reuse a key embedded in an imported legacy project.
- **Backend unavailable in the UI:** run `.\backend.ps1 health`, confirm port 8000 is free, and check `BACKEND_ORIGIN`.
