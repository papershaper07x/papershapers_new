# Noticeboard portal

SEO: public board, safety, guide and approved-notice pages share canonical/social metadata on the marketplace host. Public aliases redirect without moving private posting/dashboard requests. Nearby has its own advertised sitemap and host-specific app identity; dummy guides remain noindex and excluded from discovery. See the [SEO runbook](../../docs/SEO_IMPLEMENTATION.md).

Shared header and footer links navigate on demand instead of automatically prefetching unrelated pages. Web functions run near the Singapore Neon database; account and session access no longer triggers Study editorial seed writes. Private marketplace responses remain uncached.

## Product boundary
Local offers, events, classes, ordinary services, community activities and ideas. Public browsing does not require login. Posting requires an account, adult/policy acknowledgement, and safety review. Shared identity supports Google verified-email publication; password-only posters stay pending for operator review.

## Current flows
Area/keyword/category search, optional approximate H3 location search (1–10 km), saved finds/preferences, own submission status/withdrawal, reports, private compressed promotional images, AI review and audited operator decisions. Text prefers configured Groq; images require configured Gemini. Review failures never publish. Safety screening does not verify a business or guarantee an offer. Migrations 0009/0010 own separate marketplace tables.

## Discovery and UI
Server-rendered public notice details, two useful guides, three dummy articles labelled at top/bottom and excluded from indexing/sitemap, posting policy and canonical metadata. Ad scripts are not active; ads.txt is served only for a configured real publisher ID. Optional browser geolocation is explicit, rounded before transmission and not persisted as viewer history. Area fallback works without permission.

## Operations
See [marketplace launch guide](../../docs/MARKETPLACE_LAUNCH.md), [Vercel + Neon migration](../../docs/VERCEL_MIGRATION.md), and [test report](../../docs/MARKETPLACE_TEST_REPORT.md). Run npm run test:e2e:marketplace after building for a disposable local HTTP/database test. H3-js and Sharp are the minimal dependencies for accurate cell coverage and safe raster processing. Production provider safety, staffing, recovery, legal review, real devices and load tests remain launch requirements.

Dashboard submission statuses now distinguish awaiting review and published notices. Withdrawal refreshes server status; shared sign-out and preference controls show recoverable network errors. Saved-item/preference payloads are byte-bounded and type-checked so user-supplied metadata cannot break the dashboard.

The posting form interprets the chosen expiry day through the end of that day in India time, then sends an explicit UTC timestamp. The server still enforces expiry within 30 days. This avoids an event notice expiring at the start of its selected date.

Resource defaults now cap search responses at 51 SQL-loaded notices, avoid duplicate initial catalogue reads after populated SSR, admit one image decode per web instance with a four-megapixel server limit, and bound backend review concurrency/deadline. Full image/review capacity yields retry/pending rather than an unbounded queue. See docs/RESOURCE_PLAN.md and apply migration 0011.

The pilot image table is also capped at 1,000 records to bound metadata/index overhead; exhausted capacity needs operator retention work or a documented migration.

## Free reservations and engagement
Organisers can opt in to one-person reservation requests while posting. Visitors sign in and acknowledge adult/terms/name-sharing consent; organisers confirm or decline through their private inbox. Visitors see persistent status updates in the local desk and can cancel. No email/SMS/push delivery is promised. Closed notices stop admission and confirmation. Public counts distinguish account interest, deduplicated signed-in detail views and active/confirmed requests. There is no anonymous visitor tracking or fabricated social proof. The hero states direct discovery, 0% Paper Shapers commission and ₹0 reservation fees with venue-charge clarification. Apply migration 0012. See [business decisions and researched positioning](../../docs/MARKETPLACE_BUSINESS_MODEL.md).

## Structured discovery and portal navigation
State/UT and dependent city dropdowns cover all 36 Indian state/UT entries and curated common cities; another town can be entered. They are presets, not population rankings or an exhaustive address database. Posting records structured location plus neighbourhood text; search accepts state/city/category filters. AI review can assign up to three preset category tags, including the poster's primary choice, without bypassing safety holds. Migration 0013 adds the bounded tag array and region index.

An empty available catalogue shows a clearly labelled, non-bookable dummy preview. Visitors can toggle live notices or examples and filter examples locally. Examples never enter the database, AI review, reservations, engagement counts or notice detail URLs. Database outages are not disguised as an empty live catalogue.

Portal headers/marketplace footer stay inside Nearby; the shared Paper Shapers logo leads to the core homepage. On subdomains configure NEXT_PUBLIC_HOME_ORIGIN=https://papershapers.in; local development uses /. The local desk has section shortcuts for notices, visitor updates, organiser inbox and saved finds. Buy Me a Coffee was evaluated and omitted under the user's free-only requirement because transaction/processing fees apply.

## Production audit — 21 October 2026
Use docs/production/README.md as the ordered launch handbook. Private APIs/dashboard/post/report surfaces now have no-store/noindex response headers and baseline security headers. Preview indexing is suppressed. Sitemap discovery includes at most 500 approved, unexpired, unblocked notices and excludes pending/private/dummy records. Vercel prebuild now checks configuration and existing schema without writes; migrate/grant separately using an operator credential. No new dependency or schema migration was required by this audit.

## Vercel deployment — 22 October 2026

Deploy the repository-root Next.js project with Study and Home, using the [Vercel setup and Netlify retirement guide](../../docs/production/02-vercel/README.md). Keep the marketplace navigation base at https://marketplace.papershapers.in/noticeboard, apply migrations/grants separately and isolate Preview. Netlify build preparation has been removed; moderation, media storage and reservation contracts are unchanged.
