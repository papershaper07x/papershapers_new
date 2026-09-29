# Perspective portal

## Product boundary

Perspective compares how political and editorial lenses frame the same verified event. It owns sources, claims, analysis, editorial review, corrections, and publication history. It is not an automated opinion generator or a claim that truth always sits in the middle.

## Current experience

- Newspaper-like editorial identity with a masthead, edition rules, restrained red accents, and reading-first typography.
- Backend-fed illustrative stories with an explicit offline fallback.
- On-demand progressive, neutral, and conservative drafts with shared facts and key questions.
- A shared-fact-base panel and explicit editorial note.
- Trust model covering provenance, labelled interpretation, human review, and uncertainty.
- Optional, dismissible account prompt; reading is never gated.
- Private dashboard at `/perspective/dashboard` with D1-backed saved stories and explicit topic preferences.

## Authentication and personalisation

Accounts are optional. A reader signs in only to save a briefing, tune topic interests, or keep reading history. Topic preferences solve cold start but may rank only which stories appear first; they must never suppress a lens or create an ideological filter bubble.

## Planned backend contract

The web routes proxy `GET /v1/news/articles` and `POST /v1/news/analyze`. Fixture or RSS ingestion normalizes and deduplicates URLs in SQLite. Published articles should expose a versioned fact base, source list, claims, lenses, uncertainty, reviewer, date, and corrections. AI-produced drafts never publish without accountable review.
