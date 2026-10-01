# Netlify handoff (migration required before deployment)

Paper Shapers is deliberately being developed and verified on the local machine. The repository no longer contains a ChatGPT Sites project configuration or its packaging plugin, so this checkout cannot be published through that path by accident. The current local commands are in [RUNBOOK.md](../RUNBOOK.md).

## What works locally now

- `npm run dev` starts the vinext web application with the local D1 simulation.
- `./backend.ps1 run` starts the Python paper-generation sidecar separately.
- The browser talks only to same-origin web routes; provider keys stay in the local backend environment file.
- Accounts, generated-paper request history, contact notes, and pending/community Journal entries use the local D1-compatible database during development.

## Important deployment decision

The web app currently uses Cloudflare Worker bindings (`cloudflare:workers`) and D1. It cannot be copied unchanged to Netlify because Netlify does not provide that Worker/D1 runtime. Do not connect this branch to Netlify and press Deploy: the build may finish, but the account/session/database runtime will not work correctly. This is a planned migration boundary, not a hidden fallback or a reason to publish somewhere else.

For a Netlify launch, make one deliberate choice before publishing:

1. **Keep the current Worker + D1 web layer.** Deploy the web app to Cloudflare and point the domain there. This is the lowest-change free-tier path.
2. **Move the web layer to Netlify.** Replace the Vinext/Worker entry and D1 adapter with a standard Next.js/Netlify-compatible runtime and persistence adapter (for example Netlify Database/Postgres or another free-tier managed Postgres service), generate and run equivalent migrations, and keep all session and community moderation queries server-side.

The Python generation service is independent of either option. Host it on a container-capable service, set the web service’s private `BACKEND_ORIGIN`, and store Gemini/Groq/NVIDIA credentials only in that service’s environment settings. Never place those keys in the browser, a `NEXT_PUBLIC_*` variable, documentation, or a git commit.

## Netlify setup after the migration

Complete every item in the migration checklist first. Then use the Netlify dashboard:

1. Create a GitHub repository from the reviewed commit and connect that repository in **Netlify → Add new project**.
2. Select the production branch. Keep deploy previews enabled for pull requests, but give them separate preview environment values and a separate OAuth redirect URI.
3. Set the build command and publish directory only after the app has been converted to a standard Next.js/Netlify runtime. Do not reuse the current Vinext/Worker output settings.
4. Add server-only environment values in **Site configuration → Environment variables**. At minimum: `BACKEND_ORIGIN`, `BACKEND_SHARED_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_OAUTH_REDIRECT_URI`. Add model-provider keys only to the private Python generation service, never to Netlify.
5. Add the exact Netlify production callback (`https://your-domain/api/auth/google/callback`) to the Google OAuth client. Add a separate callback for each preview domain only if preview sign-in is deliberately enabled.
6. Deploy a preview first. Verify account creation, Google sign-in, paper generation, a saved paper, an attempted paper, archive pagination, sign-out, and the data-deletion contact path. Then promote the verified production deploy.

## Netlify migration checklist

- [ ] Select the database and implement a replacement for `db/index.ts` / `db/service.ts`.
- [ ] Port Drizzle schema/migrations, including `community_posts` and its pending-review state.
- [ ] Move session storage and cookie security settings to the chosen database/runtime.
- [ ] Deploy the Python service privately, configure `BACKEND_ORIGIN`, and verify the paper lifecycle end to end.
- [ ] Add environment variables through the Netlify dashboard only; run no deploy command with a local `.env` file.
- [ ] Set the production custom domain and test sign-in, Journal submission, paper generation, print/PDF, and recovery cache behaviour.
- [ ] Review the privacy/terms copy and moderation workflow before allowing public community posts.
- [ ] Add Google OAuth values as Netlify server/function secrets: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and the exact production `GOOGLE_OAUTH_REDIRECT_URI`; never use `NEXT_PUBLIC_` for the secret.
- [ ] Do not add a `netlify.toml` to this branch as a cosmetic deploy shortcut. First replace the Cloudflare-only imports, D1 binding, Worker hostname rewrites, and database adapter; then validate with Netlify’s local runtime.

## Git and secret safety

- The active application source is the repository root. Imported Newspaper, News, and old Paper Shapers applications are quarantined locally in `local-reference-archive/` and ignored by Git.
- The current curriculum input is local-only at `data/study-source/`; install it locally before running generation. Downloaded PDFs, SQLite stores, and generated catalogs are also ignored.
- Before every push, run `git status --ignored` to confirm `.env.local`, `backend/.env`, `local-reference-archive/`, `data/study-source/`, `data/ncert_pdfs/`, and `site-deploy.tgz` are ignored. Never use `git add -f` on them.
- If a provider, OAuth, or database credential was ever pasted into chat or committed anywhere, rotate it before public deployment.

Until those items are complete, keep the service local. `npm run build` is a production code check, not a deployment command.

The up-to-date owner checklist, audit findings, and current-repository map are in [LAUNCH_READINESS.md](LAUNCH_READINESS.md).
