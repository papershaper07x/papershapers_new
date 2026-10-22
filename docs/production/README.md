# Production launch handbook

Audit date: 21 October 2026. Scope: core Paper Shapers, Study, Journal publishing and Nearby marketplace. This is the current launch entry point. Netlify build integration was removed on 22 October 2026. The Vercel guide includes hosted-site/DNS retirement; rollback uses compatible Vercel releases. Local tests establish code behavior, not production approval.

## Execute in order

| Step | Guide | Owner | Exit evidence |
| --- | --- | --- | --- |
| 1 | [Development](01-development/README.md) | Developer | Build, tests, trace audit and reviewed release |
| 2 | [Vercel deployment](02-vercel/README.md) | Developer/operator | Isolated preview, grants, domains, rollback |
| 3 | [Security and operations](03-security-operations/README.md) | Operator | Moderation, consent, deletion, recovery |
| 4 | [SEO and editorial](04-seo-content/README.md) | Editor | Canonicals, webmaster ownership, original content |
| 5 | [Marketing and promotion](05-marketing-promotion/README.md) | Founder | Consent-based pilot and measured outcomes |
| 6 | [Ads and revenue](06-ads-revenue/README.md) | Founder/operator | Publisher approval, eligible inventory, billing acceptance |
| 7 | [Growth roadmap](07-growth-roadmap/README.md) | Product owner | Evidence-based priorities and capacity |

## Release decision

**Not approved for unrestricted public/commercial launch yet.** The code has a functional local implementation. No Vercel account, live Neon branch, DNS, legal identity, ad approval or live payment acceptance was verified by this audit. No services were purchased or deployed.

### P0: required before public launch

- Select commercial-eligible Vercel hosting. Zero commission does not make a business marketplace personal use.
- Migrate an isolated Neon preview branch; grant restricted roles; verify actual pooled connections and restore a backup.
- Keep database-owner credentials outside Vercel. Its build preflight is now read-only and rejects unsafe configuration or missing schema.
- Configure HTTPS origins, backend secret, OAuth callbacks, domain ownership/TLS and provider budgets. Compare web/backend release SHAs.
- Resolve adult/minor onboarding, guardian/school permission where applicable, publication consent and AI provider processing before marketing child accounts.
- Assign staff for reviews, reports, appeals, corrections, deletion and incidents; complete adversarial content/moderation evaluation.
- Prove deployed Study generation, teacher-room authorization, reservation decisions and failure recovery.
- Configure edge abuse protection. Email/account quotas do not stop account farms or distributed traffic.
- Keep new paid checkout and third-party ads disabled until their separate acceptance gates pass.

### P1: controlled pilot

Password verification/recovery, full reviewer UI, reservation inventory/time slots, out-of-app notifications, retention jobs, deployed load measurements and historical inbox pagination. Manual workflows support a small pilot only with actual staffing and response handling.

### P2: growth

Local languages, accessibility improvements, organiser verification, useful locality pages and fixed-price sponsorships. Delivery, ticketing, merchant payments and verified news would be separate product decisions.

## Audit changes

Journal origin/byte/quota controls; private no-store/noindex and baseline security headers; preview indexing suppression; bounded public content sitemap with curriculum timeout; read-only Vercel configuration/schema checks; an atomic migration runner that honors the owner URL; Vercel release SHA reporting; local deployment trace audit; corrected hosting/domain documentation.

See [audit findings](../PRODUCTION_AUDIT.md), [business decisions](../MARKETPLACE_BUSINESS_MODEL.md), and [local verification](../MARKETPLACE_TEST_REPORT.md).
