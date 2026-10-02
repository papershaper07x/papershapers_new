# Launch readiness — 1 October 2026

This is an engineering and product-readiness checklist for Paper Shapers, not legal advice. A qualified adviser should review the final public policies and the operator’s local obligations before a launch involving minors, schools, advertising, or paid services.

## Current repository shape

| Area | Location | Responsibility | Production status |
| --- | --- | --- | --- |
| Web application | `app/`, `lib/`, `worker/` | Server-rendered portals, sessions, API routes, hostname routing | Built for Cloudflare Worker + D1 |
| Browser UI | `app/components/`, `app/portal-ui.css` | Shared chrome and focused interactive client islands | Ready for local validation |
| Data boundary | `db/`, `drizzle/` | D1 account, session, preferences, contact, Journal, and live-room records | Requires managed D1 migrations |
| Generation service | `backend/` | FastAPI, curriculum validation, LLM routing, paper/attempt SQLite records | Local-only until deployed privately |
| Curriculum pipeline | `scripts/`, `data/`, `data/study-source/` | Official-source metadata and local extraction workflow | Review source permissions before public use; local inputs are ignored |
| Product references | `local-reference-archive/` | Imported reference implementations only | Ignored; never deploy or copy their secrets |
| Study source material | `data/study-source/` | Local approved curriculum CSV and paper-setting instructions | Ignored operational input; install locally before running generation |
| Operations | `RUNBOOK.md`, `docs/`, `config/` | Local start-up, architecture, deployment and readiness guidance | Maintained |

The deployable product is the web application plus the `backend/` service. The other top-level project folders are local reference material and are excluded by `.gitignore`.

## Google sign-in

The app now supports the Google OAuth authorization-code flow without an SDK. It appears on `/auth` only when all three server-side values below are configured. It asks only for `openid`, `email`, and `profile`; it stores a verified Google subject ID, email, and basic display name, never an access or refresh token.

```dotenv
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_OAUTH_REDIRECT_URI=https://papershapers.in/api/auth/google/callback
```

1. In Google Cloud Console, create an OAuth **Web application** client.
2. Add the exact production callback URI above to its authorised redirect URIs. Scheme, host, path, case, and trailing slash must match exactly.
3. Add the values only in the production host’s secret/environment settings. Keep `GOOGLE_CLIENT_SECRET` out of Git, browser code, `NEXT_PUBLIC_*`, screenshots, and support tickets.
4. For local testing, use a separate OAuth client or add `http://localhost:3000/api/auth/google/callback` and set the matching local environment value.
5. Test a new Google account, an existing password account with the same verified email, cancel, state mismatch, sign out, and a protected dashboard route.

The callback rejects missing configuration, a mismatched one-time state cookie, unverified email, or a profile without a Google subject. Existing password accounts are linked only after Google returns the same verified email. The implementation follows Google’s documented web-server authorization-code flow and exact redirect-URI requirement. See [Google’s OAuth web-server guide](https://developers.google.com/identity/protocols/oauth2/web-server).

## Hosting decision for today

The active application now builds with standard Next.js and uses PostgreSQL. The selected topology is Netlify for the web runtime, Render for FastAPI, and Neon for shared persistence. Publishing remains an explicit owner action after the blockers below are closed.

| Service | Current role | Requirement before launch |
| --- | --- | --- |
| Netlify | Standard Next.js frontend and server routes | Web-role Neon URL, Render origin/secret, OAuth values, final domains |
| Render | Stateless FastAPI generation service | API-role Neon URL, provider keys, shared secret, strict CORS |
| Neon | Shared PostgreSQL | Apply `database/migrations/` with a migration role and keep preview/production separate |

See [the deployment runbook](DEPLOYMENT_NETLIFY_RENDER_NEON.md) for the console order, variables, role boundaries and rollback gates.

## Launch blockers

- [ ] Upgrade and re-test the JavaScript dependency tree. The local `npm audit --omit=dev --audit-level=high` reports a critical Next.js advisory plus high-severity `nanoid`, PostCSS, and Sharp findings for the currently installed dependency graph. Do not use a blind forced audit fix while the dev server has Node files locked; update in a branch, rebuild, test, and re-run the audit.
- [ ] Apply every migration under `database/migrations/` to a fresh Neon preview branch and confirm the migration and legacy importer are idempotent.
- [ ] Deploy the FastAPI generation service privately with a non-empty `BACKEND_SHARED_SECRET`, an allow-list containing only the final web origin, managed shared persistence, provider-key rotation, timeouts, and health checks.
- [ ] Add durable rate limits/WAF rules for sign-up, password login, Google callback/start, contact, Journal submission, paper generation, feedback, and live-room joins. The current application validates input but does not yet provide distributed production rate limiting.
- [ ] Implement and rehearse an end-to-end account deletion process that removes the D1 user record **and** the matching paper/attempt data held by the separate generation service. Until this exists, handle deletion requests manually and do not promise an automatic deletion button.
- [ ] Complete the legal-operator details: legal owner/entity, contact address where required, governing law/jurisdiction, retention periods, grievance/contact process, and school/guardian approval process. The current Privacy, Terms, and Cookie pages are a transparent product baseline, not jurisdiction-specific legal advice.
- [ ] Confirm the operator’s lawful basis/consent process for minors and school live rooms. Avoid collecting DOB, precise location, parent details, or other sensitive student data unless a reviewed requirement justifies it.
- [ ] Review the use and distribution rights for curriculum PDFs, extracted text, logos, fonts, and every image. Official availability alone is not a blanket permission to republish or process content commercially.
- [ ] Set up real monitoring, backups, incident contact, abuse/moderation handling, and an owner for pending Journal posts before enabling public contributions.

## Already addressed

- Privacy, Terms, and Cookie pages are linked from every footer and distinguish essential session/OAuth cookies from non-essential tracking.
- No third-party ads or tracking cookies are enabled; student answers are not advertising-targeting signals.
- User-facing starter content is labelled illustrative or editorial, not presented as real reviews or live data.
- Sessions are HTTP-only, `SameSite=Lax`, `Secure` outside local development, and token hashes—not raw tokens—are stored.
- Google sign-in is server-side, minimal-scope, configuration-gated, uses a short-lived state cookie, and stores no provider tokens.
- Model keys and backend shared secrets are excluded from source and client-exposed variables.

## Release sequence

1. Resolve every launch blocker above in a staging environment.
2. Run `npm run build`, `npm test`, `npm run backend:test`, and a fresh high-severity audit.
3. Test at mobile, tablet, and desktop widths: public pages, password sign-up/sign-in, Google sign-in, sign-out, paper generation, attempt/review, Live Rooms, contact, Journal, and legal pages.
4. Point the custom domain at the selected host, enforce HTTPS, configure the production callback URI, then perform the same smoke test on the final domain with a disposable account.
5. Keep analytics and advertising off until the policies, consent handling, and age-appropriate safeguards have been reviewed.
