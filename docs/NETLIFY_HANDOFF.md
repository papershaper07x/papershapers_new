# Netlify handoff (migration required before deployment)

> Decision recorded: Netlify web + Render FastAPI + Neon PostgreSQL. The operational checklist now lives in [DEPLOYMENT_NETLIFY_RENDER_NEON.md](DEPLOYMENT_NETLIFY_RENDER_NEON.md); this file retains the original migration rationale.

Paper Shapers is deliberately being developed and verified on the local machine. The repository no longer contains a ChatGPT Sites project configuration or its packaging plugin, so this checkout cannot be published through that path by accident. The current local commands are in [RUNBOOK.md](../RUNBOOK.md).

## What works locally now

- `npm run dev` starts the standard Next.js web application backed by PostgreSQL.
- `./backend.ps1 run` starts the Python paper-generation sidecar separately.
- The browser talks only to same-origin web routes; provider keys stay in the local backend environment file.
- Accounts, generated-paper request history, contact notes, and pending/community Journal entries use PostgreSQL during development.

## Important deployment decision

The web app uses standard Next.js and a PostgreSQL adapter. Netlify hosts its server routes while Render hosts FastAPI; both use least-privilege Neon roles. The former Cloudflare Worker/D1 configuration is retained only in ignored local reference material.

For a Netlify launch, use the repository root as the base directory. Netlify must detect only Next.js; there must be no Vite or Cloudflare build dependency in the active application package.

The Python generation service is independent of either option. Host it on a container-capable service, set the web service’s private `BACKEND_ORIGIN`, and store Gemini/Groq/NVIDIA credentials only in that service’s environment settings. Never place those keys in the browser, a `NEXT_PUBLIC_*` variable, documentation, or a git commit.

## Netlify setup after the migration

Complete every item in the migration checklist first. Then use the Netlify dashboard:

1. Create a GitHub repository from the reviewed commit and connect that repository in **Netlify → Add new project**.
2. Select the production branch. Keep deploy previews enabled for pull requests, but give them separate preview environment values and a separate OAuth redirect URI.
3. Use `npm run build` and allow the Netlify Next.js adapter to manage publish output and route functions; do not set a manual publish directory.
4. Add server-only environment values in **Site configuration → Environment variables**. At minimum: `BACKEND_ORIGIN`, `BACKEND_SHARED_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`. Add model-provider keys only to the private Python generation service, never to Netlify.
5. Add the exact Netlify production callback (`https://your-domain/api/auth/google/callback`) to the Google OAuth client. Add a separate callback for each preview domain only if preview sign-in is deliberately enabled.
6. Deploy a preview first. Verify account creation, Google sign-in, paper generation, a saved paper, an attempted paper, archive pagination, sign-out, and the data-deletion contact path. Then promote the verified production deploy.

## Netlify migration checklist

- [x] Replace D1 persistence with PostgreSQL for `db/index.ts` / `db/service.ts`.
- [x] Add shared PostgreSQL migrations, including `community_posts` and its pending-review state.
- [x] Move session storage and cookie security settings to the chosen database/runtime.
- [ ] Deploy the Python service privately, configure `BACKEND_ORIGIN`, and verify the paper lifecycle end to end.
- [ ] Add environment variables through the Netlify dashboard only; run no deploy command with a local `.env` file.
- [ ] Set the production custom domain and test sign-in, Journal submission, paper generation, print/PDF, and recovery cache behaviour.
- [ ] Review the privacy/terms copy and moderation workflow before allowing public community posts.
- [ ] Add Google OAuth values as Netlify server/function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the exact production `GOOGLE_OAUTH_REDIRECT_URI`; never use `NEXT_PUBLIC_` for the secret.
- [x] Keep the Netlify configuration limited to the Next.js build command; do not force a static publish directory.

## Git and secret safety

- The active application source is the repository root. Imported Newspaper, News, and old Paper Shapers applications are quarantined locally in `local-reference-archive/` and ignored by Git.
- The current curriculum input is local-only at `data/study-source/`; install it locally before running generation. Downloaded PDFs, SQLite stores, and generated catalogs are also ignored.
- Before every push, run `git status --ignored` to confirm `.env.local`, `backend/.env`, `local-reference-archive/`, `data/study-source/`, `data/ncert_pdfs/`, and `site-deploy.tgz` are ignored. Never use `git add -f` on them.
- If a provider, OAuth, or database credential was ever pasted into chat or committed anywhere, rotate it before public deployment.

Until those items are complete, keep the service local. `npm run build` is a production code check, not a deployment command.

The up-to-date owner checklist, audit findings, and current-repository map are in [LAUNCH_READINESS.md](LAUNCH_READINESS.md).
