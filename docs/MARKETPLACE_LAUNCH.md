# Marketplace launch plan and operations

## Final business decisions
Public browsing is free and requires no account. Adults 18+ may submit after login and accepting the posting policy. This is a local discovery board for lawful offers, events, classes, ordinary services, community activities and ideas, not a checkout marketplace. No commissions, private chat, deposits, paid ranking, seller guarantees or identity claims. Advertising is prepared but not active.

AI may publish a clearly safe notice only when the poster has a verified identity signal. The current signal is Google sign-in, whose callback requires a verified email; it does not verify age or a business. Password-only accounts remain pending for operator review. Text uses configured Groq first when available; images use image-capable Gemini. Configured credentials stay on the existing Python backend. Shared provider budgets and retry ceilings apply. No mock, flagged, malformed, uncertain, low-confidence or failed review can approve a post. Score ≥0.98 is a conservative model threshold, not a calibrated probability. Operators can review, reject and withdraw posts with audit records. Reports do not automatically hide content.

## Implemented flows
- Authenticated same-origin submission, strict text fields, required posting acknowledgement, mandatory five-per-day limit. Invalid image work is bounded and consumes the admission allowance before expensive decoding.
- JPEG/PNG/WebP images are resized in the browser, validated and re-encoded on the server, stripped of metadata, capped at 250 KB, and stored as bytea in marketplace_media. No arbitrary remote-image fetching or public original URLs. Pending/rejected/expired/withdrawn media returns 404 from the public image endpoint; public images use no-store so withdrawal is respected.
- H3 resolution 7 stores public venue neighbourhood cells and their centres rather than original venue coordinates. Indexed candidate coverage uses overlapping cells around a bounded search square, then spherical distance orders and filters results. Search supports 1–10 km. Distances are approximate, not road routing; the result cap is disclosed.
- Viewer geolocation is requested only by an explicit button, rounded before transmission, used for the current search, and not saved as location history. Area search remains available when permission is denied. Notices without coordinates appear only in area/keyword searches.
- Own submission status and withdrawal; saved items and preferences; rate-limited reports; server-rendered public notice details.
- Useful guides plus three dummy articles with visible top/bottom disclosure and noindex. Updated sitemap, robots exclusions, optional real publisher ads.txt declaration, and a public posting/safety policy.

## Current deployment guide
[Vercel + Neon migration](VERCEL_MIGRATION.md) replaces the former Netlify-first instructions. Keep shared identity and separate marketplace tables; use compatible Vercel deployments for rollback; retire Netlify after verified cutover. Vercel Hobby is not the target for commercial advertising. No live DNS, migration, ad account or production deployment is performed by this code change.

## Operator moderation
Use a trusted operator terminal and database connection:

```
node scripts/moderate-marketplace.mjs queue
node scripts/moderate-marketplace.mjs image NOTICE_ID
node scripts/moderate-marketplace.mjs approve NOTICE_ID reviewer-name "Checked content, venue, terms and attached image" --image-reviewed
node scripts/moderate-marketplace.mjs reject NOTICE_ID reviewer-name "Content does not meet the posting policy"
node scripts/moderate-marketplace.mjs withdraw NOTICE_ID reviewer-name "Confirmed safety report; public visibility removed"
```

The image command exports a private re-encoded WebP into ignored work/marketplace-quarantine for reviewer inspection. It never creates a public URL. Delete reviewer copies when the review is complete. Image approval requires explicit --image-reviewed acknowledgement. Inspect every language, small print, links, pricing, venue information and private data. Confirm rights, avoid misleading or regulated claims, and escalate child-safety or other serious incidents through the operating business's approved procedure. Staff hello@papershapers.in and retain meaningful decision reasons. The CLI is a pilot operator tool, not full appeal/case management.

## Storage and scaling
Compressed database images are the small-pilot choice requested here. Every 1,000 maximum-sized images uses up to 250 MB before database overhead/backups. Neon free storage is finite: define retention, monitor usage and move media to private object storage when measured usage warrants it. H3-js and Sharp are justified dependencies for correct spatial indexing and safe native image decoding; PGlite/socket are development-only dependencies for isolated testing.

## Remaining gates
Real Neon and Vercel verification; dedicated provider keys when ready; email verification/recovery for password posters; staffed moderation/appeals and suspensions; retention/deletion operations; legal/operator identity and grievance procedures; comprehensive image/child-safety escalation and adversarial evaluation; provider outage/quota alerts; real browser/mobile devices; load/concurrency tests and backup restore. Full Study generation/teacher/payment production acceptance remains separate from local mocked provider tests. Existing unrelated working-tree changes were retained.

## Verification
The local production-server harness exercises anonymous browse, account/session, verified poster gate, admission limits, approval/rejection/outage/mock, private/public images, owner boundaries, saves/preferences, reporting, operator approval, expiry, withdrawal, public pages and SEO. Real AI provider smoke checks use synthetic dummy content and an isolated local budget store; no shared database changes. Detailed final results are recorded in MARKETPLACE_TEST_REPORT.md.

## Pilot media and poster controls
The image store has a default 50 MB application budget, configurable with MARKETPLACE_IMAGE_STORAGE_BYTES. A transaction advisory lock serialises budget checks and inserts; full capacity rolls back the notice and returns 507 with a text-only retry instruction. Operators can block/unblock a poster with `node scripts/moderate-marketplace.mjs block|unblock USER_ID OPERATOR reason`. Blocking withdraws existing public/pending notices and prevents new submissions; public queries also exclude blocked posters to cover publication races. Runtime needs SELECT on marketplace_poster_blocks; only operators may write it.

Resource configuration and free-host split: [RESOURCE_PLAN.md](RESOURCE_PLAN.md). Runtime pooling now defaults to one connection; apply migration 0011 and use one backend process for immediate enqueue wakeups.


## Free reservations launch addition
Apply migration 0012 and runtime grants before releasing the new routes. Existing notices remain opted out. Organisers must state visit/event timing and venue charges and monitor the private request inbox. Visitor dashboard status is the current notification channel; email, SMS and push alerts are not delivered. One-person requests require sign-in and adult/terms/name-sharing acknowledgement, do not issue tickets/time slots, and need host confirmation. Public account activity metrics never certify attendance or savings. Confirm source/fee comparisons before any comparative advertising; use the current positioning and funding decisions in MARKETPLACE_BUSINESS_MODEL.md. Review aggregate table growth and retention, name-sharing disclosure, actual merchant eligibility and cloud locking/load before public launch.
