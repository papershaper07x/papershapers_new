# Changelog

Meaningful repository changes are recorded here so the implementation, product notes, and system design stay aligned.

## 2026-09-29

### Study paper lifecycle

- Replaced Study-only landing-page anchors with standalone How it works, Study guide, For teachers, and Contact & feedback routes so header navigation works consistently from dashboard and paper routes.
- Added a public validated feedback/contact form backed by D1, clearly labelled illustrative feedback-card content, production-facing privacy/terms pages, and a Paper Shapers social-preview image.
- Kept each result-review question, submitted response, feedback, and answer outline together; prior records without this stored context disclose their limitation rather than showing misleading feedback alone.
- Refocused the Study landing page around its own navigation, educator path, substantive workflow content, structured metadata, and reduced-motion-safe interaction details; removed Study-page cross-links to the other portals from its header and footer.
- Split Study Lab from a single generator panel into independent generated-paper, answer-taking, and formative-result routes.
- Added owner-scoped paper retrieval and persisted attempt feedback contracts, plus dashboard links for returning to generated papers.
- Kept formative score estimates visibly non-official and documented the source-aware research boundary after rejecting the legacy helper with embedded credentials.
- Added a separate Class 9–12 curriculum test planner with Class 11/12 stream, textbook, chapter, paper-size, and timing choices.
- Added timed, browser-autosaved test attempts and validated model-feedback mark caps/question IDs before results are shown.
- Replaced reconstructed Class 9–12 choices with the original local Paper Shapers curriculum source, added source-backed selection validation, and changed real paper generation to fail closed instead of saving a template when no model is configured.
- Send the matching locally stored paper-setting guidance with selected chapter text to the configured real model.
- Removed LM Studio and other alternate providers from active paper generation. Gemini is now the sole real provider; the server fails closed instead of silently switching models.
- Added a Gemini-only development key ring that rotates request starting keys and retries the next key only after a failed structured response.
- Preserve paper-generation validation errors through the web proxy so the Study UI reports the actionable backend reason instead of incorrectly calling every failure an outage.
- Added a rule-based Study Guide, visible FAQs, and a school/coaching pilot path without introducing an autonomous or free-form LLM chatbot.
- Added browser-native print/save-to-PDF and owner-scoped paper feedback; feedback is review-only and never automatically changes papers, prompts, or scores.
- Added explicit Gemini, Groq, and NVIDIA NIM provider adapters with isolated local key rings and documented response/credential contracts; no provider key is exposed to browser code.
- Added an expiry-bound, identity-free paper cache that is only used as a recovery path after every configured real provider fails; cached-paper copies retain independent learner ownership and attempt history.
- Confirmed the curriculum boundary remains imported approved metadata/context only; the product does not fetch or re-host official textbook PDFs.
- Made the recovered-paper state visible in the Study reader so a learner knows the service reused a validated matching brief after an outage.
- Updated Groq and NVIDIA defaults to models currently visible to the supplied development accounts after detecting retired legacy model IDs during connection checks.
- Treat a provider response that fails the Study paper schema and mark validation as a routing failure, allowing a later key/provider or recovery cache rather than returning unusable model JSON.
- Tuned the Groq JSON adapter to hide reasoning tokens and allow a full-paper completion; a live temporary-database check generated a valid 40-mark paper without writing learner data.

### Configurable local backend

- Audited the imported news batch/inference and study-generation projects; quarantined them as reference-only because they contain embedded credentials, duplicated services, and heavyweight mandatory dependencies.
- Added FastAPI + SQLite vertical slices for full/half study generation, normalized news ingestion and three-lens analysis, and interest/area-ranked illustrative marketplace listings.
- Added a server-side generation boundary with Gemini and a deterministic test-only fallback, without exposing keys to the browser.
- Connected each portal through same-origin web API proxies, preserving mandatory Study authentication and public News/Marketplace browsing.
- Added backend tests, Windows setup/run/batch/health commands, configuration examples, an audit report, and deployment migration guidance.

### Portal separation, identity, and dashboards

- Reworked the three portal identities: an academic workbench for Study, an editorial reading room for Perspective, and a location-first marketplace for Nearby.
- Added hostname-aware Worker rewrites for `learn`, `news`, and `nearby` subdomains without browser redirects.
- Added a shared sign-up/login/logout flow with PBKDF2 password derivation, hashed session tokens, HTTP-only cookies, and cross-subdomain cookie support.
- Added Cloudflare D1/Miniflare storage with users, sessions, study requests, user preferences, and saved-item tables plus a generated migration.
- Made authentication mandatory when creating a study brief while keeping news and marketplace browsing public.
- Added a private, database-backed dashboard for each portal and clearly labelled sample cold-start records.
- Added optional account nudges for Perspective and Nearby, stored study briefs, saved news/local items, and editable portal interests.
- Documented the free-tier Cloudflare Workers + D1 recommendation, local database flow, custom-domain setup, and future Netlify/Firebase tradeoff.

### Local handoff

- Recovered the complete Paper Shapers source into the local `C:\papershapers` workspace.
- Added a Windows runner for setup, development, linting, builds, and tests.
- Added the local runbook, reconstructed project brief, and UI/UX workflow guide.
- Linked the parent README, portal documentation, system design, and change workflow.

### Initial multi-portal release

- Added the Paper Shapers umbrella home.
- Added Study Lab, Perspective, and Noticeboard as distinct product routes with a shared brand baseline.
- Added responsive behaviour, focused client interactions, structural tests, and high-level system design.
