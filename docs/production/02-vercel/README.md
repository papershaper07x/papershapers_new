# Vercel, Neon and backend deployment

Updated 22 October 2026. Netlify build configuration and automatic migration code have been removed. This guide is the supported deployment path. Account/DNS changes below are operator steps; they have not been executed by editing this repository.

## 0. Prepare the release

Keep one Vercel project for all three web domains, one existing Python backend service, and Neon. No repository move, separate frontend build, or new database provider is needed. Check that the backend is actually deployed and has approved curriculum data; the website alone cannot run the persistent Study worker.

From PowerShell at the repository root:

```powershell
npm ci
npm test
npm run backend:test
npm run lint
npm run audit:deployment
```

Use the configured Python environment for backend tests. Review the release diff, include required source, migrations and public Android artifacts, then commit and push the reviewed release to your Git provider. Do not blindly commit unrelated local files. Never upload `.env.local`, `backend/.env`, signing keys, owner URLs or database exports. `.vercelignore` applies to CLI uploads; `.gitignore` does not remove previously tracked secrets from Git history.

## 1. Confirm architecture and plan

Use Vercel for root Next.js, the existing service for FastAPI plus its persistent Study worker, and Neon PostgreSQL. Do not move that worker into a request-scoped Function. Vercel Hobby permits personal non-commercial use; this business needs eligible hosting before launch: [official policy](https://vercel.com/docs/plans/hobby). No paid plan was activated.

## 2. Isolate Preview

Create a distinct Neon preview branch and runtime role. Keep production credentials out of Preview/Development. PREVIEW_DATABASE_ISOLATED=true acknowledges isolation; it does not create or prove it. Use the pooled runtime connection and direct owner connection for migrations/backups. Test actual timeout/driver parameters against the pooler: [Neon pooling](https://neon.com/docs/connect/connection-pooling).

## 3. Migrate outside Vercel

Inject MIGRATION_DATABASE_URL only into a trusted operator or separate CI migration step. Run `npm run db:migrate:postgres`. It prefers that URL, serialises migration runners with a transaction advisory lock and commits the batch atomically. The DATABASE_URL fallback is for trusted local/operator execution. Current idempotent migrations are reapplied; review schema locks and maintenance timing.

Grant only required table operations. Keep existing account/session/preferences/Study grants. Journal web access is SELECT/INSERT, with publication UPDATE reserved for operators. Marketplace needs SELECT/INSERT/UPDATE notices and engagement/reservations, SELECT/INSERT media/reviews/reports, and SELECT poster blocks. Request limits need SELECT/INSERT/UPDATE. Backend roles need reviewed generated-content/budget grants. Test actual writes; schema presence does not prove grants.

Do not add MIGRATION_DATABASE_URL to the Vercel project: ordinary variables can be available at build and runtime. Vercel prebuild validates configuration and reads schema only; the former Netlify mutation path has been removed. [Variable scope](https://vercel.com/docs/environment-variables).

For a trusted local migration session, read the owner URL without putting it in command history:

```powershell
$migrationSecret = Read-Host 'Neon DIRECT owner URL for the intended branch' -AsSecureString
$env:MIGRATION_DATABASE_URL = [System.Net.NetworkCredential]::new('', $migrationSecret).Password
try {
  npm run db:migrate:postgres
  if ($LASTEXITCODE -ne 0) { throw 'Migration failed; stop deployment.' }
} finally {
  Remove-Item Env:MIGRATION_DATABASE_URL -ErrorAction SilentlyContinue
  Remove-Variable migrationSecret
}
```

This command does not load `.env.local` and does not grant runtime permissions. In Neon's SQL editor on that same branch, use an owner session to create/review separate `papershapers_web` and `papershapers_api` login roles and grant `USAGE ON SCHEMA public`. Grant web SELECT on `schema_migrations` and the exact table operations listed above; existing auth, saved-item and room flows also require their current INSERT/UPDATE/DELETE permissions. Do not use blanket `GRANT ALL` or substitute an owner URL when preflight reports permission denied. Review [database permissions](../../../database/README.md) and the existing backend migration/grant command before deployed write tests. Migration-owner secrets remain confined to those trusted sessions.

## 4. Configure the web project

In Vercel, choose **Add New → Project**, import the reviewed Git repository, and configure:

| Project setting | Value |
| --- | --- |
| Root Directory | Repository root; leave the field empty/default, not frontend/ or backend/ |
| Framework Preset | Next.js |
| Node.js Version | 22.x, matching the tested major; review any engine-range warning |
| Install Command | npm ci |
| Build Command | npm run build && npm run audit:deployment (committed in vercel.json) |
| Output Directory | Framework default; do not set out/, public/ or a static export |
| Production Branch | Your actual reviewed release branch; do not assume its name |

Do not configure Edge runtime or a Python web build. No global Netlify or Vercel CLI dependency is needed. Create the project/configure variables before retrying a failed first deployment; an initial build with missing secrets should fail closed. See [Next.js deployment](https://vercel.com/docs/frameworks/full-stack/nextjs) and [supported Node versions](https://vercel.com/docs/functions/runtimes/node-js/node-js-versions).

Under **Project → Settings → Environment Variables**, enter the following values separately for Production and Preview. Set production public URLs exactly as shown:

| Variable | Setting |
| --- | --- |
| DATABASE_URL | Restricted pooled connection for this environment |
| DATABASE_POOL_MAX | 1 initially |
| BACKEND_ORIGIN | Actual HTTPS backend origin, no path/query |
| BACKEND_SHARED_SECRET | Matching high-entropy value, at least 32 characters, on web/backend |
| REQUEST_LIMITS_ENABLED | true |
| MARKETPLACE_ENABLED | true for this two-portal release |
| MARKETPLACE_AI_REVIEW_ENABLED | true only with provider safety acceptance; otherwise pending/operator review |
| NEXT_PUBLIC_HOME_ORIGIN | https://papershapers.in |
| NEXT_PUBLIC_STUDY_ORIGIN | https://study.papershapers.in/papershapers |
| NEXT_PUBLIC_MARKET_ORIGIN | https://marketplace.papershapers.in/noticeboard |
| PREVIEW_DATABASE_ISOLATED | true only for an actually isolated preview/development DB |
| BILLING_CHECKOUT_ENABLED | false until paid acceptance passes |
| BILLING_ENABLED | false for the initial unpaid release |
| GOOGLE_CLIENT_ID | Google Web OAuth client ID, if enabling Google login |
| GOOGLE_CLIENT_SECRET | Matching secret; server-only |

For Preview use a separate DB, backend environment/secret and OAuth client. Set public URLs to your stable, protected preview hostname: `https://<preview-host>`, `https://<preview-host>/papershapers` and `https://<preview-host>/noticeboard`. Do not send Preview navigation to the production account/database. Prefer an approved stable preview URL over registering every ephemeral commit URL. If there is no isolated backend/DB, postpone Preview acceptance rather than borrowing production credentials. Variable changes require a new deployment, especially NEXT_PUBLIC values embedded at build time.

Do not manually set VERCEL or VERCEL_ENV; Vercel supplies them. Do not bulk-import the local example into Production: it contains localhost values, disabled limits and an owner-variable placeholder. Leave MIGRATION_DATABASE_URL completely absent. Do not copy old NETLIFY/CONTEXT/DEPLOY_PRIME_URL settings. AI provider keys stay on the backend.

Configure exact Google callbacks per hostname. Keep provider keys on Python, ALLOW_MOCK_FALLBACK=false, PostgreSQL persistence and approved curriculum. Coordinate any service-secret rotation. Never print secrets in logs or put them in public variables.

In Google Cloud's Web OAuth client, add these exact **Authorized redirect URIs**:

```text
https://papershapers.in/api/auth/google/callback
https://study.papershapers.in/api/auth/google/callback
https://marketplace.papershapers.in/api/auth/google/callback
```

The current code derives the callback from the incoming HTTPS host; GOOGLE_OAUTH_REDIRECT_URI is not an override. Add an isolated preview callback only if testing that host. Test login/logout across all production siblings because the app shares a `.papershapers.in` session cookie. Remove abandoned/untrusted siblings before relying on that scope.

## 5. Check limits and latency

At this audit, standard Node Functions have a 250 MB uncompressed bundle ceiling and 4.5 MB payload ceiling, with a single default iad1 region: [limits](https://vercel.com/docs/functions/limitations). The notice JSON bound is 1.45 MB and encoded media <=250 KB. Keep APK downloads static. `npm run audit:deployment` checks local traces against a conservative 200 MiB review budget and private/backend source inclusion; Windows traces are not Linux deployment measurements.

Choose a region close to actual Neon/backend locations where the plan permits. One DB connection per instance is not a global limit. Test aggregate pooling, cold starts, p95 latency, review concurrency, provider quotas, memory and 429/503 behavior under a modest staged load. Do not raise function duration to hide a stalled worker or load-test paid providers without a budget.

## 6. Preview acceptance

Protect preview deployments and use synthetic accounts. Preview responses are noindex, robots blocks crawling and sitemap is empty. Test OAuth, all portal roots, private media/papers, teacher scopes, Journal pending state, reservations, reports, model outage and storage caps. Use payment test mode. Compare `/api/release` Vercel commit with backend `/version`.

## 7. Cut over and roll back

Add papershapers.in, study.papershapers.in and marketplace.papershapers.in to one project. Use exact DNS records shown by Vercel; preserve mail records and verify TLS: [domain guide](https://vercel.com/docs/domains/working-with-domains/add-a-domain). Do not redirect all aliases to core Home. Register real Google callback URLs and trust every sibling sharing cookies.

Record previous DNS/deployment/backend versions, migration set and restore point. Cut over only after acceptance. Roll back code/backend/DNS when core access or queue behavior fails; do not drop tables to undo code. Rehearse restore separately, repeat public HTTPS smoke tests and monitor quotas/errors after cutover.

Preflight does not verify commercial eligibility, actual branch identity, DNS, write grants, backups or model safety. Those require operator evidence.

## 8. Remove the hosted Netlify dependency

Do these steps only after the Vercel release passes acceptance; deleting the old site first can create downtime. This repository no longer requires it during build or runtime.

1. Inventory Netlify hosting, DNS, domain registration, redirects, environment variables, Git integration and any webhooks. Export required configuration securely and keep a DB recovery point. Old deployed functions may still contain owner secrets even though their repository code is gone.
2. If DNS is already at your registrar or another provider, replace only the web records indicated by Vercel for the three hosts. If Netlify is authoritative DNS, recreate the full zone at your chosen independent DNS provider first: MX, SPF/DKIM/DMARC, TXT verification, CAA, apex/subdomains and other services. Then change nameservers at the registrar. Review DNSSEC/DS with both providers to avoid a validation outage. Do not delete the Netlify zone before the new authority is working.
3. If Netlify also manages domain registration/renewal, DNS migration alone does not transfer registration. Complete an eligible registrar transfer or retain registration temporarily until it can safely move; verify renewal ownership. No registrar transfer is required merely to use Vercel hosting.
4. Verify public DNS and TLS for all three hosts, the correct portal at each root, Google login, a full Study flow, a pending Journal submission, a marketplace reservation/report, and mobile navigation. Check `/api/release` matches the intended commit. Confirm payment webhooks still reach their unchanged custom hostname if already configured; keep new checkout disabled until accepted.
5. After an operator-chosen observation/rollback window, stop Netlify automatic builds and disconnect its repository/build hooks. Remove obsolete branch-deploy OAuth callbacks and required Git status checks. Remove duplicate traffic analytics or redirects only after identifying their replacements.
6. Stop/delete the old Netlify site and remove its stored secrets/integrations when no traffic or obligations remain. Rotate credentials that were copied to it, including an owner credential if exposed there; coordinate backend/web service-secret rotation and deploy the replacement before retiring its predecessor. Do not delete Neon or the Python backend.
7. Cancel unwanted Netlify subscriptions/add-ons after checking domain renewal and charges. Verify there are no required `netlify.app` links in public campaigns, the APK, OAuth or merchant settings. Git history retains the removed config; future rollback is to a compatible Vercel release, not an active Netlify build.

Domain authority, registration, billing and site deletion are separate actions. Record completion evidence for each rather than assuming a DNS change closes the account.

## 9. Troubleshoot the first deployment

| Symptom | Next check |
| --- | --- |
| Missing schema / migration 0013 | Migrate the intended branch separately; grant ledger/table reads |
| Remove MIGRATION_DATABASE_URL | Delete it from every Vercel environment, then redeploy |
| Preview isolation error | Create an isolated branch/backend and only then acknowledge isolation |
| Connection timeout / permission denied | Restricted pooled URL, actual grants, Neon connection settings and regional connectivity |
| Android release validation fails | Commit the matching approved APK and mobile release metadata; do not bypass validation |
| OAuth redirect mismatch | Exact incoming hostname callback in Google, HTTPS and correct environment client |
| Site works but generation fails | Backend deployment/curriculum, matching service secret, persistent worker, quota/provider errors |
| Subdomain shows Home or redirects away | Domain assigned to the same project with no global redirect; inspect proxy root mapping |
| Preview links open production | Correct Preview NEXT_PUBLIC origins and rebuild |

Use deployment Build Logs for install/prebuild errors and project runtime Logs for requests; filter by the support reference without printing database URLs. After success monitor DB connections, backend memory/queue, provider usage and errors. Keep backups and the last compatible Vercel release available. Search engine and ad launch steps remain in the [production handbook](../README.md).
