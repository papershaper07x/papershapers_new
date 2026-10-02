# Paper Shapers

Paper Shapers is an umbrella for small, practical digital products. This repository contains one deployable application with three deliberately independent product experiences:

- **Study** (`/papershapers`, future `learn.papershapers.in`) — focused CBSE practice, private paper briefs, and study history.
- **Perspective** (`/perspective`, future `news.papershapers.in`) — one news story viewed through clearly labelled political lenses, with saved reading and topic preferences.
- **Nearby Marketplace** (`/noticeboard`, future `nearby.papershapers.in`) — fresh posts from nearby shops, services, events, and communities, with area and interest preferences.

The current release includes a working local account system, HTTP-only sessions, shared PostgreSQL persistence, portal dashboards, stored preferences, and a separate Python backend. Study papers use the supplied local Paper Shapers curriculum source and fail clearly instead of saving a template when no configured model returns a valid result. The required curriculum input is local-only at `data/study-source/` and intentionally excluded from Git. The backend also stores attempts, returns formative feedback, ingests/analyzes news, and ranks illustrative marketplace listings. Study includes teacher-hosted Live Rooms with student waiting-room polling and live response tracking (`/papershapers/for-teachers/rooms` and `/papershapers/room`), a non-agentic rule-based guide for common student and educator questions, browser-native print/save-to-PDF for generated papers, private paper-feedback capture, a moderated Journal, and a personal dedication page. Feedback is held for human product review and does not automatically influence learner marks, paper prompts, or model training. Editorial review, business verification, and production moderation remain later phases.

## Run the repo

Requirements: Node.js 22.13 or newer and Python 3.11 or newer.

On Windows, the project runner is the shortest path:

```powershell
powershell -ExecutionPolicy Bypass -File .\run.ps1 setup
powershell -ExecutionPolicy Bypass -File .\backend.ps1 setup
powershell -ExecutionPolicy Bypass -File .\backend.ps1 run
# In a second terminal:
powershell -ExecutionPolicy Bypass -File .\run.ps1 dev
```

Then open `http://localhost:3000`. Use `Ctrl+C` to stop the development server.

The equivalent direct npm commands are:

```bash
npm install
npm run dev
npm run build
npm test
```

See [RUNBOOK.md](RUNBOOK.md) for every supported local command and troubleshooting notes.

Before generating a paper in a fresh clone, restore the approved local curriculum CSV and `instructions.csv` under `data/study-source/`. These source inputs, downloaded NCERT PDFs, generated SQLite/JSON stores, old reference applications, and local environment files are deliberately ignored so they cannot be committed by accident.

The web application now runs on standard Next.js and uses PostgreSQL through `DATABASE_URL`; the former D1 schema remains only as migration history while parity is verified. The selected production target is Netlify (web), Render (FastAPI), and Neon (PostgreSQL). Local PostgreSQL and SQLite fallback tests remain available. See [the deployment runbook](docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md). No paid authentication provider is required.

Apply `npm run db:migrate:postgres` before the first account request. Password sign-in works locally today; Google sign-in is implemented but appears only after its server-only OAuth environment values are configured. See [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md) for the exact setup and pre-launch checks.

## Accounts and access rules

| Surface | Public reading | Account rule | Private dashboard |
| --- | --- | --- | --- |
| Study (Self-practice) | Product explanation and paper options | Required before a paper brief is stored or generated | `/papershapers/dashboard` |
| Study (Live Rooms) | Room entry landing page (`/papershapers/room`) and student attempts via scoped session cookie | Required for teachers to host rooms; account-free for student attendees | `/papershapers/for-teachers/rooms` |
| Perspective | Full public briefing and lens comparison | Optional nudge for saving and personalisation | `/perspective/dashboard` |
| Nearby | Full public browsing and filtering | Optional for saving; required for posting | `/noticeboard/dashboard` |

One session can work across `*.papershapers.in` after the final cookie domain is configured. Passwords are salted with a unique random value and derived with PBKDF2-SHA-256. Raw passwords and session tokens are never stored.

## Subdomain model

The Worker performs an internal hostname rewrite rather than a browser redirect:

| Public hostname | Internal route |
| --- | --- |
| `papershapers.in` | `/` |
| `learn.papershapers.in` | `/papershapers` |
| `news.papershapers.in` | `/perspective` |
| `nearby.papershapers.in` | `/noticeboard` |

Set these build-time values when custom domains are ready so cross-product navigation also uses subdomains:

```dotenv
NEXT_PUBLIC_HOME_ORIGIN=https://papershapers.in
NEXT_PUBLIC_STUDY_ORIGIN=https://learn.papershapers.in
NEXT_PUBLIC_NEWS_ORIGIN=https://news.papershapers.in
NEXT_PUBLIC_MARKET_ORIGIN=https://nearby.papershapers.in
```

During local development the fallback URLs remain `/papershapers`, `/perspective`, and `/noticeboard`, so no hosts-file changes are needed.

## Repository map

```text
app/
  components/          shared site chrome
  api/                 auth, preferences, moderated-community, saved-item, and study request endpoints
  auth/                shared account entry
  papershapers/        education portal, paper, attempt, teacher live room, and student room routes
  perspective/         news comparison portal and its product README
  noticeboard/         local discovery portal and its product README
  globals.css          shared visual system and responsive rules
backend/
  app/                 FastAPI routes, local SQLite adapter, and model router
  Dockerfile           Render container boundary (after Postgres migration)
  fixtures/            offline illustrative news input
  tests/               backend integration tests
  README.md            backend configuration and API contract
docs/
  SYSTEM_DESIGN.md     high-level architecture, flows, and rollout plan
  UI_UX_GUIDE.md       shared experience rules and per-portal interaction flows
  PROJECT_BRIEF.md     clearly labelled reconstruction of the founding brief
  BACKEND_AUDIT.md     review and migration decisions for imported code
  NETLIFY_HANDOFF.md   local-only hosting decision and future migration checklist
  DEPLOYMENT_NETLIFY_RENDER_NEON.md selected five-console deployment runbook
frontend/
  README.md            web boundary and staged physical-move contract
tests/
  site-structure...    low-cost structural guardrails
  live-rooms...        SQLite lifecycle, room states, attendee options, and route guardrails
AGENTS.md              standing maintenance rules for future changes
CHANGELOG.md            human-readable history of repository changes
RUNBOOK.md              local setup, validation, and deployment handoff
run.ps1                 Windows command runner
db/
  schema.ts            Drizzle source-of-truth for account, study, contact, community, and test room tables
  service.ts           schema bootstrap and data access boundary
worker/index.ts         image handling plus hostname-to-portal routing
```

## Architecture decisions

1. **One deployable, multiple bounded products.** This makes the first release inexpensive and easy to maintain. Each portal keeps its own route, UI identity, dashboard, and data boundary and can later be extracted without redesigning it.
2. **Subdomains at the edge, not browser redirects.** The Worker internally rewrites each hostname to its portal route. The address bar stays on the product subdomain, and the route remains available for local development.
3. **Server components by default.** Interactive islands are small client components. This limits shipped JavaScript and keeps content fast on low-end mobile devices.
4. **Shared accessibility, distinct product voices.** Study uses a navy-and-gold academic workbench, Perspective uses an editorial reading room, and Nearby uses a bright location-first marketplace. They no longer share a generic card language.
5. **Replaceable backend adapters.** The Python service uses SQLite locally and will use shared Neon PostgreSQL on Render. Its explicit server-side Gemini/Groq/NVIDIA NIM sequence, owner-scoped contracts, and expiry-bound identity-free recovery cache remain behind authenticated Netlify server routes; credentials never reach the browser.

Full architecture and rollout details live in [docs/SYSTEM_DESIGN.md](docs/SYSTEM_DESIGN.md). The interaction model and responsive behaviour are documented in [docs/UI_UX_GUIDE.md](docs/UI_UX_GUIDE.md).

Before a public launch, read [docs/LAUNCH_READINESS.md](docs/LAUNCH_READINESS.md) and [the selected deployment runbook](docs/DEPLOYMENT_NETLIFY_RENDER_NEON.md). They map the active application, Google OAuth, network boundaries, data deletion, minor safety, moderation, and hosting blockers. Netlify/Render/Neon remains a target architecture until both migration gates pass.

## Responsive and accessibility baseline

- Fluid type and layouts across mobile, tablet, and desktop.
- Mobile navigation uses a real button with an expanded state.
- Product controls are keyboard-operable native buttons.
- Motion is reduced when the visitor requests it.
- Colour is paired with labels; it is never the only carrier of meaning.
- Content width, tap targets, and dense cards collapse deliberately below 920 px and 600 px.

## Documentation contract

Every functional or architectural change must update the closest portal README and, when the change affects shared behaviour, this README or `docs/SYSTEM_DESIGN.md`. User-visible and operational changes are also recorded in `CHANGELOG.md`. The standing rule is recorded in `AGENTS.md` so future contributors and coding agents inherit it automatically.
