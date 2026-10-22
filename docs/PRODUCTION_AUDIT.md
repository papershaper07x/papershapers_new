# Production audit — 21 October 2026

Scope: core Home, Study/private papers/teacher rooms, Journal publication, Nearby marketplace, deployment, resource use, SEO and commercial readiness. This is a code/local verification audit, not a certification of a live service.

## Decision

**Local hardening is complete for this change; unrestricted public launch remains gated.** Read the ordered [production handbook](production/README.md). No Vercel project, production/shared database, DNS, ad account, payment transaction or outreach campaign was changed. Existing unrelated working-tree changes were retained; no commit was created.

## Findings resolved in code/documentation

| Finding | Change | Evidence |
| --- | --- | --- |
| Root handoff still described Netlify and obsolete learn/nearby hostnames | Rewrote root README and corrected environment examples; Netlify is rollback history | Current handbook and deployment guide |
| Migration runner ignored MIGRATION_DATABASE_URL and could partially apply a batch | Prefer owner URL; transaction advisory lock; atomic batch; generic failure output | Isolated migration test deliberately gives an invalid runtime URL and a valid owner URL |
| Ordinary Vercel environment settings could expose migration-owner credentials to runtime | Vercel prebuild now rejects that variable and performs configuration/schema checks only; migration/grants run separately | Configuration tests and real isolated prebuild process |
| Missing schema/bad navigation settings could deploy broken portal paths | HTTPS/path/secret/required-flag/preview checks plus existing-table/column/ledger probes | Missing-schema and unsafe-config rejection tests |
| Journal POST lacked parity with marketplace admission guards | Same-origin, 16 KB stream bound, strict fields, five/account/day, pending-only, generic failure response | Anonymous/origin/oversize/forged-status/quota HTTP cases |
| Private/indexing and baseline browser headers were incomplete | Private no-store/noindex; framing/MIME/referrer/device protections; preview noindex/robots suppression | Response-header HTTP checks and preview metadata/config tests |
| Public sitemap omitted actual published inventory and could wait on a sleeping backend | <=500 approved/unexpired/unblocked notices, <=500 published Journal slugs, five-second curriculum deadline, static fallback | Pending/dummy/withdrawn exclusion and published inclusion tests |
| Vercel release endpoint could report local instead of its commit | Read VERCEL_GIT_COMMIT_SHA first; align audit release label with backend | Build and endpoint source review |
| Raw auth errors could include database details | Log exception type instead of raw exception payload | Source review; existing auth integration checks pass |
| No explicit web deployment context/trace review | Root-anchored .vercelignore exclusions preserve nested portal/API source during CLI uploads; npm run audit:deployment rejects private/backend sources and >200 MiB local traces | Exclusion regression test and local trace audit pass; Vercel build command includes it |

No new runtime dependency, schema migration, paid service, map SDK, ad SDK or external notification provider was added.

## Validation results

| Check | Result |
| --- | --- |
| npm test, including production build and TypeScript | 63 passed |
| npm run backend:test | 50 passed |
| npm run test:e2e:marketplace | 42 passed |
| npm run lint | Zero errors; nine existing warnings |
| npm run audit:deployment | 75 local traces; largest 7,392,068 bytes, approximately 7.1 MiB; no forbidden material |
| npm audit --omit=dev | Zero reported vulnerabilities |
| npm audit including development dependencies | Five high-severity entries in the existing braces/fast-glob/micromatch/Next lint chain |

The suggested automatic audit fix downgrades eslint-config-next to an older major; it was not applied. Treat untrusted repository/build inputs separately from runtime traffic, keep CI secrets away from untrusted pull requests and track a compatible upstream remediation. Runtime audit cleanliness is not proof of complete security.

Lint warnings cover existing full-navigation behavior, deliberately direct compressed media images and unused variables in existing Study/reference code. No warning was represented as a runtime failure. The trace measurement is Windows/local; it excludes Vercel runtime overhead and is not a Linux function-size, hosted memory, load or performance guarantee.

The E2E database is disposable PostgreSQL-compatible PGlite and the AI HTTP transport is stubbed. The test covers the real web handlers and SQL flow, not real Neon locks/grants, OAuth approval, live model safety or payment processing. The earlier live-model smoke check remains historical evidence, not a new adversarial safety evaluation.

## P0 launch gates still open

1. **Hosting/commercial eligibility — founder:** choose an eligible Vercel plan and review actual budgets. A paid/ad-supported business cannot rely on the personal non-commercial Hobby terms. No plan was purchased.
2. **Actual infrastructure — operator:** isolated preview branch, role grants, real pooler connectivity, backend curriculum packaging/licensing, matching service secret, exact domains/TLS/OAuth and approved provider settings. Preflight cannot prove branch identity or write grants.
3. **Recovery — operator:** export/restore to a separate branch, define realistic recovery targets and test versioned rollback. Free-host storage/availability is not a backup strategy.
4. **Privacy/minor onboarding — operator and appropriate professional:** settle audience, guardian/school permission where required, AI-provider processing, publication consent, retention/deletion and accountable grievance/incident handling before recruiting children or opening unrestricted accounts.
5. **Publishing operations — editor/moderator:** staffed queue/report/appeal/correction handling; adversarial text/image evaluation; privacy/copyright/regulated-claim checks. AI approval is neither business verification nor verified journalism.
6. **Abuse/load — developer/operator:** edge bot/distributed signup controls, actual Neon concurrency/locking, aggregate serverless DB connections, provider quotas, cold starts and production RSS. Existing per-instance/account limits do not impose a global traffic ceiling.
7. **Deployed acceptance — developer:** actual Study generation/attempt/teacher-room isolation, reservation responses/closure, browser/device privacy and Google callback flows through the three public hosts.
8. **Money/ads — founder:** keep new checkout and third-party advertising off until merchant/test-mode refund/capture/reconciliation, capacity economics, publisher approval, eligible inventory and consent choices pass.

## P1/P2 work and growth

Password verification/recovery, operator UI/audit workflow, event time/inventory and party-size contracts, verified opt-in out-of-app delivery, historical inbox pagination and operational retention automation remain product work. Manual host confirmation and dashboard updates are already implemented; do not confuse them with ticket allocation or email notifications.

Growth should begin with a real neighbourhood and adult teacher/guardian pilot. Use useful original public content and permission-based organiser outreach. Expand languages, organiser verification and sponsorship only after observed demand/support/cost evidence. The [growth roadmap](production/07-growth-roadmap/README.md) distinguishes proposals from implemented features; the [marketing guide](production/05-marketing-promotion/README.md) contains draft copy, not sent messages or claimed traction.

## Primary references reviewed

- [Vercel plan policy](https://vercel.com/docs/plans/hobby), [function limits](https://vercel.com/docs/functions/limitations), [environment scope](https://vercel.com/docs/environment-variables), [upload exclusions](https://vercel.com/docs/deployments/vercel-ignore).
- [Neon pooled connections](https://neon.com/docs/connect/connection-pooling).
- [Google Search Essentials](https://developers.google.com/search/docs/essentials), [UGC spam prevention](https://developers.google.com/search/docs/monitor-debug/prevent-abuse).
- [AdSense eligibility](https://support.google.com/adsense/answer/9724/eligibility-requirements-for-adsense?hl=en-uk), [UGC responsibility](https://support.google.com/adsense/answer/1355699), [placement policies](https://support.google.com/adsense/answer/1346295).
- [MeitY DPDP rules publication](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025). The operator must review actual applicability, commencement phases and duties with an appropriate professional; no universal legal-compliance claim is made here.
