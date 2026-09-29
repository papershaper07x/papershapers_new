# Noticeboard portal

## Product boundary

Noticeboard is a local, time-sensitive directory for offers, services, classes, events, and community posts. It owns places, geographic areas, posts, expiry, verification, reports, and moderation. It is not a social feed and should not optimise for outrage or infinite engagement.

## Current experience

- Bright, location-first marketplace identity with rounded tickets, warm yellow/green/orange colour, and a friendly search-and-discovery rhythm.
- Category filtering over backend-ranked, clearly illustrative Bengaluru listings with a static offline fallback.
- Public browsing and filtering; saving or posting invites sign-in.
- Private dashboard at `/noticeboard/dashboard` with a coarse neighbourhood, D1-backed interests, and saved local finds.
- Product principles for freshness, distance, and transparent business information.

## Authentication and cold start

Accounts are optional for browsing. Signed-in people can explicitly choose their coarse area and interests; this is the cold-start signal until real save/click history exists. Exact coordinates are not collected. Posting requires an account now and will require business/community verification and moderation before public launch.

## Planned backend contract

`GET /api/marketplace/listings` proxies the backend catalogue and ranks by coarse area, selected interests, and freshness. Posts contain an organiser, area, category, title, body, contact action, and expiry. User publishing remains disabled until verification, abuse controls, and an auditable moderation queue exist.
