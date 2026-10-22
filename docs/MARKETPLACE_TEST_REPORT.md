# Local verification and remaining launch work

Latest local re-verification: 21 October 2026. Original implementation and live-provider smoke checks: 13 October 2026. The test database is disposable and isolated; no shared Neon migration, DNS change, ad activation or production publication was performed.

## Automated results
- `npm run build`: passed, including TypeScript and production page generation.
- `npm test`: 63 tests passed, including existing Study/billing/mobile/observability checks plus input, H3 coverage, distance, date-line, image safety and deployment packaging tests.
- `npm run backend:test`: 50 tests passed, including Study generation/assessment/queue contracts and strict marketplace judge validation, mock rejection and privacy/injection escalation.
- `npm run test:e2e:marketplace`: 42 checks passed against the production Next server and an isolated PostgreSQL-compatible PGlite database. AI HTTP transport is stubbed so approval/rejection/outage/mock cases are reproducible.
- `npm run lint`: no errors; nine warnings remain (existing navigation/unused variables plus deliberately direct media images). Images are already compressed and use no-store; an additional caching image optimizer must not make withdrawn media public.
- Dependency audit rerun on 21 October: production dependencies have no reported vulnerabilities. Full development audit: five high entries share the existing braces advisory through the lint toolchain. See PRODUCTION_AUDIT.md; do not force a framework downgrade.

## HTTP/database coverage
Anonymous browse; blocked anonymous posting; account/session creation; verified-email publication gate; foreign-origin rejection including Study writes; required adult/policy acknowledgement; rejection of forged status and invalid coordinates; safe publication and review provenance; pending image privacy; provider outage/mock/rejection handling; daily posting limit; indexed H3 nearby results; invalid viewer coordinates; owner-only withdrawal; malformed preferences/metadata; saved items and own dashboard; duplicate-report idempotence; audited operator approval and image-review acknowledgement; compressed public image with no EXIF; server-rendered details; expiry removes details/media; owner withdrawal; image budget rollback; poster block; robots exclusions, sitemap and dummy noindex; public Home/Study/policy pages; session invalidation after logout.

PGlite runs PostgreSQL-compatible SQL over a local socket, with connection multiplexing. This validates the local data/HTTP flow but does not substitute for Neon load, concurrent locking, role-grant or restore tests.

## Live AI smoke checks
Only synthetic dummy text and a synthetic image were sent, using existing configured keys and an isolated SQLite budget store. Initial Gemini attempts failed/truncated under a small output allowance; review output room was increased within the configured ceiling and text now prefers configured Groq. Final checks returned a valid Groq text approval and a valid Gemini image hold with an uncertainty flag. The uncertain image remained non-publishable by policy. This confirms connectivity and fail-closed handling, not comprehensive classifier accuracy or legal compliance.

## Browser and layout checks
Used the in-app browser against the isolated production server. Checked 360 px phone, 768 px tablet, 1366 px laptop and 1920 px desktop. Checked page-width overflow, marketplace search/empty state, populated image fixture, dummy top/bottom disclosure and noindex metadata, Home intent selection, Study learner/teacher selection, mobile menu/login boundary, password sign-in and correct dashboard/post return. Screenshots verified readable layout; no horizontal overflow in those inspected views. Posting form includes venue coordinates, image controls and policy/provider acknowledgement. Actual location permission/GPS was not requested from the user during tests; coordinate geometry and API validation are tested separately. Real Safari/Android devices remain unverified.

## Decisions implemented
Reuse Neon and shared identity with separate marketplace tables. Use H3 + geographic distance, not H3 steps as metres or road navigation. Keep visitor location optional and rounded, and store approximate public venue cells. Keep images in compact private bytea storage for the pilot, with a 250 KB per-image and 50 MB total payload ceiling. Require verified-email identity plus a strict safe AI result for automatic publication; uncertain/unverified cases require operators. Keep a manual override/report/appeal route. Dummy content stays labelled and out of search indexing. No personalised advertising or third-party ad scripts are active.

## Outstanding production gates
1. Apply migrations/grants to an approved isolated Neon preview branch, then production after staging approval; verify backups/restore and Neon concurrency/locking behaviour.
2. Configure Vercel commercial-eligible hosting, DNS/TLS and all Google callback URLs. Existing Python worker stays on its current service. Test the three live origins and shared-cookie security after cutover.
3. Obtain publisher approval and appropriate consent/child-inventory choices before serving ads; ads.txt alone does not deliver ads or approve the site. Verify Google/Bing ownership and submit the canonical sitemap.
4. Establish operator identity, staffed grievance/appeal handling, response procedures, retention/deletion and incident escalation with an appropriate local professional. Terms/privacy were expanded, but legal compliance is not certified.
5. Evaluate real AI false positives/negatives and adversarial images/text, special-language handling, child-safety escalation and provider outages/quotas. A model confidence value is not a calibrated safety probability. Dedicated marketplace keys remain a future operational separation.
6. Add email verification/recovery for password-only posters, a full reviewer/case-management UI, out-of-app notification delivery, and owner-edit workflows. Operators already have blocking and withdrawal tools.
7. Complete physical-device checks and full deployed Study generation/teacher-room/payment acceptance. Existing backend tests exercise those contracts with test providers; they do not certify live model grading or payment processing.

## Research references
Technical choices use primary documentation: [H3 region coverage](https://h3geo.org/docs/api/regions/), [H3-js](https://github.com/uber/h3-js), [Gemini image inputs](https://ai.google.dev/gemini-api/docs/image-understanding), [accessible motion](https://web.dev/learn/accessibility/motion), [Google search policy](https://developers.google.com/search/docs/essentials/spam-policies), [Vercel commercial restriction](https://vercel.com/docs/plans/hobby), [Vercel domain setup](https://vercel.com/docs/domains/working-with-domains/add-a-domain), and [PGlite test sockets](https://pglite.dev/docs/pglite-socket).

Google and Bing were searched in the browser. Reddit design discussions and Stack Overflow H3 distance discussions were consulted for common pitfalls; implementation decisions were checked against the primary documentation above. No copied community articles or invented event facts were added as live inventory.

Resource pass: listing results are bounded in SQL to 51 rows; native image admission is single-flight with a four-megapixel decode ceiling; review has a single-flight/deadline gate; worker wakeup/backoff tests cover prompt enqueue and idle compute. Hosted RSS, memory under production load and real Neon concurrency are still unverified. See RESOURCE_PLAN.md.


Local catalogue-only tracemalloc measurement: 69.9 MiB retained/peak traced Python heap. Native/process memory and hosted concurrency are excluded. Curriculum caches now retain one source path each. The final resource pass has 56 frontend tests, 48 backend tests and 27 isolated HTTP/database checks passing.

## Reservation and zero-commission follow-up
Production build and the same 56 frontend tests passed again for this release; lint has no errors (the same nine warnings). The expanded local end-to-end suite passed all 35 checks with no shared database access. It adds organiser opt-in, adult/terms/name-sharing consent, anonymous/foreign-origin/forged-identity guards, organiser self-count exclusion, repeated detail-view deduplication, reversible interest, concurrent duplicate reservation submissions, organiser-only confirmation/decline, private host/visitor dashboards, cancelled/declined request reopening rejection, and closure overriding earlier confirmation while preserving cancellation. Account totals are not verified-human counts. Backend code is unchanged in this follow-up; the earlier 48-test result is retained above.

Browser follow-up inspected 360/768/1366/1920 px marketplace copy/cards and 360/768/1366 px reservation details without horizontal overflow. A disposable account returned to the exact notice after sign-in, registered interest and saw the count/status update; the reservation button was visibly disabled before terms/name-sharing acknowledgement. No real booking or acceptance of user terms was performed through the browser; reservation/confirmation/decline paths were exercised in the isolated HTTP test suite. Dashboard/email/SMS distinctions are documented rather than claiming external delivery. Physical devices, deployed Neon lock/load/grant tests and sustained free-tier capacity remain unverified.

## Completed interruption recovery — 21 October 2026
The saved implementation was rechecked after the interrupted sessions. A fresh production build and all 59 frontend tests, 50 backend tests and 37 isolated HTTP/database checks passed. Lint completed with zero errors and the same nine warnings. No application code changes were needed in this recovery pass; the report's stale totals have been corrected.

Coverage now includes structured state/city validation, primary/secondary AI category search, all migrations through 0013, a single reservation opt-in, production CSS freshness, labelled non-bookable demo fixtures, core-home logo navigation and portal-specific navigation. Existing reservation, reporting, image safety, expiry, account isolation, quota and outage checks also passed. Provider transport is stubbed in the isolated end-to-end run, so this is not a new live-model safety evaluation.

A fresh browser check verified Maharashtra → Pune → Classes returns the fictional class example. No horizontal overflow was observed at 360/768/1366/1920 px. The Paper Shapers logo opened the actual core homepage at /. Current screenshot: artifacts/marketplace-review/verified-2026-10-21.png. Earlier posting/dashboard browser checks are recorded above; their corresponding automated checks passed again.

The disposable preview was shut down after verification. Production/shared Neon migrations, DNS/deployment, live Google/payment flows, real-device behavior and hosted memory/load remain outside this local verification. All code remains saved locally; no commit or deployment was created by this recovery pass.

## Production audit follow-up — 21 October 2026
The final production-audit change passes 63 frontend tests including the build, 50 backend tests and 42 isolated HTTP/database checks. New coverage exercises separate owner migration credentials, read-only Vercel schema/config checks, rejection without secret disclosure, private/security headers, Journal origin/payload/publication/quota guards, published sitemap inclusion, preview discovery suppression and root-anchored deployment exclusions. Local deployment audit found 75 traces, no forbidden source and a largest trace of 7,392,068 bytes (about 7.1 MiB); this excludes Vercel runtime overhead/Linux measurement. Production dependency audit reports zero vulnerabilities; the full development audit still reports five high entries in the existing lint dependency chain. Lint has the same nine warnings and no errors.

The ordered handbook is docs/production/README.md and the findings/launch decision are docs/PRODUCTION_AUDIT.md. This audit does not migrate shared Neon, provision/purchase hosting, activate ads/payments, send marketing messages or certify production/legal/model safety. Earlier result totals in historical sections describe their own earlier passes.
