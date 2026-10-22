# Development and release verification

## 1. Prepare the checkout

Use Node 22.13+ and Python 3.11+. Review the existing working tree first: this checkout contains work from earlier sessions. Keep credentials, signing keys and private moderator exports out of Git. Run `npm ci`; create the Python environment and install backend/requirements.txt as described in backend/README.md.

Configure ignored `.env.local` and `backend/.env` from their examples. Browsers call same-origin Next APIs; only the web server calls Python using the service secret. Never expose a provider/database secret through NEXT_PUBLIC variables.

## 2. Prepare isolated data

Use local PostgreSQL or a separate Neon branch. Apply migrations through 0013 with an owner credential, then use a restricted runtime role. Back up before migration. Never point fixtures or previews at production.

The backend Dockerfile includes data/curriculum_store.sqlite. Verify the approved curriculum source exists in its deployment context and works with the actual reader; the CSV/instructions workflow is documented in backend/README.md. Check source licensing: tracking a curriculum file does not grant redistribution rights. Curriculum is not mutable user data.

## 3. Run locally

Start the backend with `python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --no-access-log`, then `npm run dev`. Windows wrappers are run.ps1/backend.ps1. Use one backend process initially so persistent queue wakeups work as designed.

## 4. Preserve boundaries

Shared chrome/styles belong in app/components and app/globals.css; portal behavior stays in its portal folder. The logo opens core Home and portal navigation stays local. Cross-portal communication uses stable URLs/versioned contracts, not hidden browser state. Read the installed Next documentation before changing framework APIs.

## 5. Verify the release

Stop production previews before rebuilding their `.next` directory. Run:

```powershell
npm run lint
npm test
npm run backend:test
npm run audit:deployment
npm run test:e2e:marketplace
```

`npm test` includes a production build. The end-to-end runner creates a disposable PostgreSQL-compatible database and production Next process. Its AI transport is stubbed. It proves neither live provider accuracy nor Neon locking/load/payment behavior.

## 6. Inspect experience and failures

Check 360/768/1366/1920 px and physical Android/iOS devices. Include keyboard focus, zoom/reflow, native selects, contrast, reduced motion, errors, empty/dummy states, image processing support and geolocation denial. Check Google/password returns, logout, private media, expiry, cancellation and teacher-room ownership. Use synthetic accounts; do not accept a user's terms or make real payments during tests.

## 7. Record and review

Record commit, migrations, environment, tests, screenshots, limitations and risk owners in PRODUCTION_AUDIT.md. Review both production and development dependency audits; never force a framework downgrade just to silence an advisory. Review untracked files too: a local green build does not prove the complete implementation was committed.

## 8. Stage before launch

Include migrations, scripts and deliberate signed public Android artifacts; exclude private signing material. Run acceptance on an isolated deployment and rehearse rollback before DNS cutover. An untested browser/provider/device path remains a launch task, not an assumed pass.
