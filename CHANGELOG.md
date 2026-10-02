# Changelog

## 2026-10-02

- Removed inactive Vite, Vinext, Cloudflare and Drizzle build tooling from the deployable package so Netlify reliably selects its Next.js runtime and deploys server/API functions instead of a static repository snapshot.
- Started the production persistence migration: added one shared PostgreSQL schema, a migration runner, standard Next.js PostgreSQL access, a dual PostgreSQL/SQLite FastAPI adapter, local least-privilege roles, and a successful local PostgreSQL paper-generation integration test.
- Copied the existing local D1 and backend SQLite records into PostgreSQL with an idempotent importer; dependent room records are ordered after papers and genuinely orphaned diagnostic rows are reported and skipped.
- Recorded Netlify + Render + Neon as the selected experimental production topology, including five-console setup, network boundaries, environment ownership, preview isolation, cold-start behaviour, backup expectations, and two explicit migration gates.
- Added the Render Docker build boundary and `PORT` compatibility while retaining SQLite as local-only storage until the PostgreSQL adapter is complete.
- Defined the staged frontend folder boundary so the physical move happens with the Netlify/PostgreSQL migration instead of creating a cosmetic, broken restructure.

Meaningful repository changes are recorded here so the implementation, product notes, and system design stay aligned.

## 2026-10-01

### Google sign-in and launch readiness

- Added a configuration-gated Google authorization-code sign-in flow with a short-lived HTTP-only state cookie, verified-email requirement, no stored Google access/refresh tokens, and D1 identity links that can safely connect an existing password account.
- Added the `auth_identities` schema/migration and made the pre-existing runtime-created Live Room tables idempotent in the managed migration so a staging upgrade can be tested safely.
- Added a public Cookie notice and expanded Privacy/Terms copy for essential cookies, Google sign-in scope, live-room responsibilities, minors, and data-request expectations without presenting prototype content as legal advice.
- Added `docs/LAUNCH_READINESS.md`, which maps the deployable versus reference folders, explains Google configuration, records why this Cloudflare/D1 branch cannot be deployed to Netlify unchanged, and lists concrete production blockers including the dependency audit, rate limiting, deletion, moderation, source rights, and child-data controls.
- Replaced unsupported syllabus-coverage, speed, accuracy, and performance claims on the Study landing page with precise source-aware and formative-practice descriptions.
- Restored an offline CSV fallback for the curriculum loader, kept paper-setting guidance separate from scraped chapter text, and made backend tests select available source-backed chapters rather than stale hard-coded labels.
- Corrected the Google sign-in redirects to construct mutable response headers before setting the OAuth state/session cookies, resolving the local HTTP 500 on sign-in start.
- Hardened Study paper access: anonymous visitors are redirected to sign-in from paper, attempt, and result URLs; same-origin APIs already reject anonymous requests; and the local backend now fails closed unless its server-to-server shared secret is configured.
- Rebuilt generated-paper question rows into stacked, responsive reading blocks so long section and chapter labels no longer squeeze or split the question text.
- Added linked request-history rows and a paginated private paper archive. The dashboard now shows the four newest papers without hiding older records, and new briefs retain the exact generated-paper ID for a safe reopen link.
- Quarantined the imported News/Newspaper/reference applications under an ignored local archive, moved the active local curriculum inputs to `data/study-source/`, and excluded generated curriculum files and packaging output from Git.

## 2026-09-29

### NCERT Curriculum Scraper, Tabular Store & Self-Healing Database

- **Self-Healing Database Migrations:** Resolved `D1_ERROR: no such column: ai_evaluation` by introducing automatic, self-healing dynamic `ALTER TABLE` column migrations in `ensureDatabase()` and `getTestAttendees()` in `db/service.ts`, guaranteeing backward compatibility on pre-existing database files.
- **Button Contrast Enforcement:** Resolved text visibility on `.button--accent` across all themes and containers by enforcing `color: #111827 !important; background: #c9ff47 !important; font-weight: 900 !important; border: 2px solid #111827 !important;` with explicit inline styles, eliminating low-contrast white-on-lime text.
- **Gen Z & AI-Empowered Copywriting:** Re-energized Study portal and umbrella landing page copy with vibrant, motivating, student-friendly tone ("Crack CBSE Boards Powered by AI", "Speedrun practice", "Instant AI grading with zero fluff", "Live Exam Arenas").
- **NCERT Textbook Scraper Pipeline & Class 1–12 Scaling:** Created `scripts/ncert_curriculum_scraper.py` extracting official curriculum metadata, book titles, and chapter PDF URLs from `https://ncert.nic.in/textbook.php`. Scaled to support all grades from Class 1 through Class 12 (`--classes all` or specific grade lists), discovering 1,149 textbooks.
- **Human-Navigable Directory Structure:** Standardized raw PDF downloads into clean, intuitive folders organized by grade, subject, and book title: `data/ncert_pdfs/Class_{XX}/{Subject}/{Book_Title}/Chapter_{YY}_{code}.pdf`, with automated migration of legacy flat paths.
- **PyMuPDF Text Extraction & Tabular Storage:** Extracted clean chapter text from NCERT PDFs using PyMuPDF (`fitz`), storing structured data into a modern SQLite store (`data/curriculum_store.sqlite`) with indexes on `(grade, subject)`, exporting a hierarchical JSON catalog (`data/curriculum_catalog.json`), and synchronizing the local study-source CSV.
- **Dedicated Integrity & Extraction Validator:** Built `scripts/validate_curriculum_extraction.py` and `--validate` flag, allowing educators and auditors to cross-verify that SQLite stored text matches physical chapter PDFs on disk side-by-side with 100% extraction fidelity checks.
- **Semi-Annual Recurrence Schedule:** Configured 6-month recurrence support (`--schedule-info`) for cron (`0 0 1 */6 *`) and Windows Task Scheduler, alongside manual on-demand triggers (`--run-now`, `--sample`).
- **Enhanced Backend Curriculum Loader:** Updated `backend/app/curriculum.py` to automatically detect and load from the high-speed indexed SQLite curriculum store with automatic fallback to CSV.
- **Test Suite Updates:** Extended `tests/live-rooms.test.mjs` to verify scraper structure, database schemas, and recurrence specifications.

### Live Rooms UX, Teacher Verification & AI Evaluation

- **Teacher Verification Layer:** Restricted live room creation to verified educators using a new `user_roles` database table. Added role selection (Student vs. Teacher) and institution capture to the signup flow, and an educator verification gate with institutional confirmation on `/papershapers/for-teachers/rooms`.
- **Contrast & Readability Fixes:** Resolved button and container contrast issues (black text on dark navy cards in `/for-teachers` and white text on lime `.button--accent`), enforcing high-contrast text and crisp typography across all devices.
- **CBSE Syllabus Diversity:** Expanded live room creation from a single frozen Class 9 English option to all CBSE Class 9–12 subjects, grades, and paper sizes (full and half papers) with on-demand paper generation.
- **Educator Review Deck & AI Assessment:** Redesigned student responses into spacious educator review cards. Added an on-demand **Run AI Assessment** action that calculates percentage, earned marks, and question-level formative commentary comparing student answers to expected marking rubrics, stored in `test_attendees.ai_evaluation`.
- **Interactive Question Visualization:** Created `<QuestionInput>` rendering interactive selectable choice tiles with radio indicators for MCQs, focused single-line inputs for short/fill-in-the-blank questions, and structured multiline textareas for descriptive answers.
- **Persistent Header Navigation:** Restored `<SiteHeader>` and `<SiteFooter>` on deep live room routes (`/for-teachers/rooms`, `/for-teachers/rooms/:roomId`, `/room`, `/room/:roomId`) with clear breadcrumbs to prevent disorientation.
- **Formative AI Disclaimers:** Added explicit educational disclaimers across the umbrella homepage, Study landing page, live room review deck, and AI evaluation cards clarifying that AI evaluations are practice estimates to aid teachers and students.
- **Test Coverage:** Updated `tests/live-rooms.test.mjs` verifying role verification, schema migration, AI evaluation lifecycle, and question input structure.

### Teacher Live Rooms

- Added a live test session functionality in the Paper Shapers portal. Teachers can create a test room using a specific paper ID or select directly from their generated paper library.
- Students can join using the Room Code landing route (`/papershapers/room`) or direct room link (`/papershapers/room/:roomId`), entering their Name and Roll Number.
- Implemented an interactive waiting room with status polling for students while the teacher prepares the session.
- Added teacher authorization controls ensuring only room owners can start or conclude live test rooms.
- Added student session cookie protection preventing unauthorized submissions across different attendees.
- Added live attendee monitoring with auto-refresh and quick clipboard join link sharing for teachers.
- Added real-time student response tables formatting submitted answers question-by-question alongside roll numbers and names.
- Added `test_rooms` and `test_attendees` tracking tables in the D1/SQLite schema with cascading foreign keys.
- Added integration test suite `tests/live-rooms.test.mjs` verifying schema, CRUD lifecycle, attendee submission decoding, and route structure.

### Local-first Journal and dedication

- Made the repository’s working policy explicit: keep development local, removed its ChatGPT Sites project configuration and packaging plugin, and added a Netlify handoff document that explains the current Cloudflare Worker/D1 incompatibility and the migration steps required before a deliberate Netlify launch.
- Added a Paper Shapers Journal with editorial starter guides, structured metadata, paper-note visual motion, and a dedicated personal dedication page.
- Added signed-in Journal submissions with a pending-review state. Public Journal pages show only explicitly published entries; there are no comments, direct messages, uploads, learner-score fields, or automatic public posting.
- Extended the Study navigation/footer and responsive styles for the new content routes, with scroll reveals that respect reduced-motion preferences.
- Added named project credits for Harsh Kushwaha and Ankit Varshney to the dedication page.

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
