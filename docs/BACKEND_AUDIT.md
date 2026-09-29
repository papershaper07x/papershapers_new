# Imported backend audit

The folders `newspaper2`, `newspaper`, `papershapers`, and `news_papershapers` were reviewed as reference implementations. They are ignored by the active repository and are not imported at runtime.

## What was retained

| Reference capability | Retained design |
| --- | --- |
| RSS ingestion and article normalization | Canonical URL deduplication, fixture/RSS ingestion, explicit source and publication time |
| Three news personas | Structured progressive, neutral, and conservative lenses with shared facts and questions |
| Full paper generation | A validated 80-mark blueprint and structured persisted result |
| Smaller assessment | A distinct 40-mark half-paper blueprint rather than truncating a full paper |
| Provider-backed generation | Gemini-only real generation with test-only deterministic fallback |

## What was rejected or deferred

- Embedded API/database credentials and provider-specific global clients were rejected. Any exposed credentials from the copied projects must be rotated before reuse.
- Mandatory Pinecone, Redis, transformer, and PDF stacks were deferred until retrieval quality and upload requirements are proven.
- Duplicated FastAPI modules, permissive CORS, raw exception responses, and in-memory production rate limiting were not carried forward.
- The study reference's fixed Class 12 blueprint was not generalized by pretending it applied to every curriculum.
- Automatic publication of generated political framing was rejected. Production news requires provenance, versioning, corrections, and editorial approval.
- The old batch and inference applications shared assumptions but not a stable contract. The replacement uses one schema and storage boundary that can later be split.

## Migration path

1. Validate the synchronous vertical slices locally.
2. Add approved curriculum/source records and schema validators before vector retrieval.
3. Move generation and feed ingestion to idempotent queued jobs when latency or volume warrants it.
4. Replace SQLite through repository functions, leaving web proxy contracts unchanged.
5. Add moderation/editorial consoles before user-generated marketplace posts or news drafts become public.
