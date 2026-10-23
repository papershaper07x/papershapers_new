# Changelog

## 2026-10-23

- Implemented public canonicals/social metadata and safe alias redirects, consistent cross-portal navigation, umbrella search copy and structured brand identity. Added per-site robots/sitemaps, offline curriculum discovery with controlled logging, host-specific app identity, source-derived chapter labels with numeric ordering and legacy selection compatibility, regression/crawl tooling and an external acceptance runbook. No new dependencies or database migration.

- Added an evidence-based SEO audit of the root, Study and Nearby sites, including live canonical coverage, changing sitemap completeness, curriculum label quality and corrections to the earlier provisional report. No SEO application changes or deployment.

- Verified a real full Class 11 Computer Science paper through the local web/API/Neon flow: 31 questions, 80 marks, five 1/1/2-mark case studies and two diagrams, including checkpoint recovery. Checked mobile/tablet/desktop layouts and A4 printing; restored the normal provider cap after verification.


- Made case-study subparts mandatory in each requested JSON shape (1/1/2 marks) and reserved Gemini 2.5 Flash output space by bounding thinking tokens inside the unchanged output cap.


- Added bounded schema-repair feedback to provider fallback and allowed paced board-mock generation/verification sufficient worker and polling time.


- Added validated batch checkpoints so failed paper requests can resume without regenerating accepted questions. Full papers now use five batches by merging the final singleton; the reader discloses reused questions. No new schema or dependencies.


- Verified local provider credentials and removed three rejected Groq entries from ignored local configuration; retained two valid keys and the original configuration backup. Hosted credentials are unchanged.

- Live generation diagnostics exposed repeated earlier questions and provider throttling. Prompts now explicitly exclude previous questions, and Groq batches are paced for shared free-tier token throughput without increasing retry or site-call caps.

- Connected local web and API configuration to the reviewed existing Neon database using dedicated restricted runtime roles; aligned local service authentication and preserved original environment files in ignored backups. Existing hosted-role passwords and application records are retained; no automatic local-data import or legacy-table retirement.

- Reworked chapter-practice generation into validated batches with server-owned question numbering, marks and types, balanced curriculum excerpts, checked MCQ options, case-study subparts, OR choices and diagrams. Provider fallback now reaches another configured vendor within the existing retry ceiling; missing AI budget tables/grants report service configuration failure. Updated job/polling bounds without increasing site allowances.
- Restyled saved papers as printable exam sheets with subject/class headings, candidate details, section totals and right-margin marks. Selected-chapter 40/80-mark papers remain explicitly labelled adapted practice. Added regression coverage for full/half assembly, context coverage, vendor fallback and nested content validation.

## 2026-10-22

- Fixed the Python PostgreSQL adapter's unescaped SQL percent wildcards, which could prevent the generation worker from claiming queued papers. Added an isolated PostgreSQL-wire worker/quota regression command.

- Fixed failed paper requests exhausting account allowance before any paper was generated. Backend admission now counts completed work and active reservations per account, releases failed work automatically, preserves retry delays and distinguishes provider-budget failures. Existing incorrectly charged web daily counters are ignored; no database reset/migration is needed. Deploy backend before web.

- Reduced web latency by colocating Vercel functions with Neon in Singapore, keeping editorial seed writes off authentication paths, deduplicating session reads per render, caching public curriculum fetches for one hour, and reducing automatic navigation prefetches. Added streamed Study loading feedback without changing AI quotas.

- Fixed Render startup and Vercel database access with Neon pooling by moving statement timeouts from connection startup parameters into the transaction performing each operation.

- Fixed Vercel dependency installation by aligning `eslint-config-next` with Next.js 16.4.0 and ESLint 9, and refreshing the npm lockfile without peer-dependency bypasses.

## 2026-10-03

- Kept markets visibly unconfigured rather than fabricating live prices, and documented the source-licence requirement for reused, transformed, or commercial publisher content.
- Added an audited CLI transition for explicitly publishing one non-sensitive candidate during local editorial review.

## 2026-10-02

### Architecture and Anti-Slop Refactoring

- **De-slopped the UI:** Eradicated massive inline style objects across the codebase in favor of a robust, modular approach using clean Tailwind CSS utility classes and centralized CSS.
- **Atomic Components:** Broke down the 600-line monolithic `app/papershapers/for-teachers/rooms/[roomId]/page.tsx` file into small, atomic components (e.g., `attendee-card.tsx`, `room-exceptions.tsx`) to separate interactive client logic from server data fetching.
- **Refactored Rooms Dashboard:** Completely rewrote `app/papershapers/for-teachers/rooms/page.tsx` to utilize standard semantic markup and Tailwind layout grids, reducing its footprint from ~350 lines to ~220 lines.
- **Motion & Depth:** Introduced a subtle, 40-second drifting blueprint grid animation to the `study-information` layout wrapper. This removes the static "blank" feel from the informational pages (Terms, Privacy, For Teachers) while fully respecting the `prefers-reduced-motion` accessibility constraint.
- **Contrast & Alignment Fixes:** Enforced correct z-index layering and specificity for the Study portal header, ensuring the navbar text is fully legible and appropriately contrasted against the dark blue background.

- Expanded the root README into a knowledge-transfer runbook covering the current Next.js/Netlify + FastAPI/Render + Neon architecture, local setup, migration history, environment ownership, Cloudflare DNS, security rules, deployment gotchas, and known production blockers.
- Fixed production deploys that reported success but served 404 on every route: `netlify.toml` now sets the `.next` publish directory and explicitly enables the Next.js runtime plugin so pages and API routes deploy as functions.
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

- Added a server-side generation boundary with Gemini and a deterministic test-only fallback, without exposing keys to the browser.
- Added backend tests, Windows setup/run/batch/health commands, configuration examples, an audit report, and deployment migration guidance.

### Portal separation, identity, and dashboards

- Added a shared sign-up/login/logout flow with PBKDF2 password derivation, hashed session tokens, HTTP-only cookies, and cross-subdomain cookie support.
- Added Cloudflare D1/Miniflare storage with users, sessions, study requests, user preferences, and saved-item tables plus a generated migration.
- Added a private, database-backed dashboard for each portal and clearly labelled sample cold-start records.
- Documented the free-tier Cloudflare Workers + D1 recommendation, local database flow, custom-domain setup, and future Netlify/Firebase tradeoff.

### Local handoff

- Recovered the complete Paper Shapers source into the local `C:\papershapers` workspace.
- Added a Windows runner for setup, development, linting, builds, and tests.
- Added the local runbook, reconstructed project brief, and UI/UX workflow guide.
- Linked the parent README, portal documentation, system design, and change workflow.

### Initial multi-portal release

- Added the Paper Shapers umbrella home.
- Added responsive behaviour, focused client interactions, structural tests, and high-level system design.

## 2026-10-09 — Student platform production hardening

- Protect Live Room attendee re-entry, remove student-visible answer outlines, verify paper ownership, and reject closed-room/overwrite submissions.
- Fail production assessment closed on invalid reviews instead of awarding answer-length marks; validate submitted IDs and finite scores.
- Add recoverable drafts/timers, network retry states, complete MCQ selection matching, math rendering, curriculum-driven teacher choices, honest educator labels and practice copy.
- Repair curriculum URLs/source boundary; add sitemap/robots, error/404/focus navigation, shared request budgets and deployed revision endpoints. Disable analytics recording pending consent work.
- Document the production audit, platform comparison, remaining launch gates and deployment checks.
- Upgrade Next.js/ESLint config to 16.4.0 and apply compatible dependency patches; use the existing patched KaTeX version throughout the math dependency tree. Production dependency audit has zero reported findings.

### Scientific question content
- Added validated structured circuit, uniform-field and flow diagrams across question reading, attempts, Live Rooms, review and printing; enabled chemical equation notation using existing KaTeX.
- Preserved diagram data through normalization, caching and assessment; added notation and diagram contract regressions.

### CBSE paper-quality audit
- Documented official sample-paper comparisons, historical local output findings, source/guidance gaps, and ordered assessment-quality work in `docs/CBSE_PAPER_QUALITY_AUDIT.md`; generator behavior is unchanged.

### Local backend migration recovery
- Added an explicit owner-credential migration command and actionable startup errors for missing PostgreSQL schema versions; retained least-privilege runtime configuration.

### Portal retirement
- Removed the unused reading portal, API, workers, fixtures, styles, configuration, legacy archives and obsolete dependency. Study and Noticeboard remain.
- Added an owner-run storage cleanup migration and compatible marketplace preference persistence; removed obsolete startup schema requirements.

### Study interface refinement
- Reworked the planner into five labelled steps with accessible selection states, readable chapter labels, a live paper summary, and inline generation progress.
- Simplified Study copy and paper actions; added consistent local SVG icons and balanced text wrapping. Full papers remain labelled chapter practice until board profiles are verified.

### Production generation timeouts
- Move planner generation to durable backend jobs with short web requests and owner-scoped polling; recover interrupted claims and keep unfinished jobs out of paper/assessment routes.
- Handle HTML gateway errors safely, preserve legacy synchronous responses during deployment overlap, and add job lifecycle/response regressions.

### Board mock drafts
- Added separate 2026–27 CBSE Class 10 Standard / Class 12 Mathematics profiles, exact slots/unit marks, full-source checks, grouped generation and bounded repairs.
- Added model solve/check verification, OR/subpart controls, bounded mathematical schematics and exam-style reader/printing. Keep drafts labelled pending educator review; protect answer keys and provide operator review export.
- Aligned the installed Next.js lint configuration with Next 16 after finding a mismatched Next 14 configuration.

- Fixed board-reader overflow on small screens, removed site navigation from printed papers, and corrected the plot prompt example to satisfy its bounded diagram contract.

## 2026-10-10 — Optional membership, contributions and mobile app

- Added Razorpay prepaid 30-day Study Plus with manual renewal, contributions, owner payment history, signed reconciliation, replay-safe grants and refund revocation. Payments default disabled pending operator configuration.
- Added PostgreSQL billing migration, runtime grant preparation and paid queue priority with free-request aging.
- Added installable PWA metadata/icons, Android/iPhone installation guide and private-data-safe offline fallback; no native store binaries.
- Updated payment/privacy disclosures and billing/mobile activation runbook.

- Replaced untyped educator error-page props and excluded vendored Three.js from source linting.

## 2026-10-10 — Direct Android APK and operator activation handoff

- Built a small release-signed Android browser launcher with no runtime permissions or native API client; web UI/backend updates arrive through the hosted site.
- Added a stable APK download route, versioned binary, release checksum/signer metadata, installation instructions, and prebuild integrity validation.
- Added Windows Android SDK packaging/signing script with private key storage outside source and immutable release filenames.
- Added detailed payment merchant/KYC, test/live deployment and signing-key backup guidance; no NGO registration or charitable-tax eligibility is assumed.
- Separated new-checkout pause from paid entitlement reads so a sales pause or gateway key change does not remove existing access. The operator will deploy the prepared APK.

## 2026-10-11
- Added visible Free/Study Plus comparison and contribution discovery across landing pages, navigation, study desk and planner.
- Differentiated account generation request limits: Free 3 and active Plus 6 per fixed 10-minute window when shared usage controls are enabled.
- Updated project page map and commercial flow documentation; payments remain gated by activation settings.

## 11 October 2026 — Study navigation and front-end roadmap
- Added local destination search, active Study navigation, and mobile menu dismissal on link selection or Escape.
- Documented prioritised UX, aggregate analytics and operational tracing work; excluded Clarity because Microsoft restricts its use on under-18-targeted sites.

- Corrected Study mobile-menu contrast and constrained expanded navigation to the viewport.

## 11 October 2026 — Free AI cost guardrails
- Enforced five daily account AI requests shared across generation and feedback, independent of optional burst controls, with reset messages and no exhausted-quota payment upsell.
- Added atomic persistent global provider-call ceilings, bounded key/provider retries, explicit output/input caps, and an operator pause switch.
- Added migration 0008, runtime grants, cost-control runbook and concurrent/reset/failure tests. Provider currency budgets remain separate dashboard configuration.

## 11 October 2026 — First-party tracing and operational logs
- Added structured Study API/backend/provider logs, random support references and durable generation queue correlation with wait/execution timing.
- Added coarse page-request logging and an offline log summariser; no vendor tracker or student session replay.
- Suppressed backend raw URL/access logging, updated the privacy notice and documented hosting access/retention; added privacy, concurrency and durable-trace tests.
## Marketplace additions — 2026-10-13
- Replaced public demo inventory with approved, unexpired notices and area/keyword search.
- Added authenticated, rate-limited text submission, reporting, and operator moderation with audit records. Images remain blocked pending a private screening pipeline.
- Added marketplace production plan and subdomain deployment instructions.
- Hardened shared account, preference and saved-item POST routes against cross-origin requests; added bounded marketplace request reads and anonymous-action tests.

## 13 October 2026 — marketplace review, media, search and hosting
- Added fail-closed text/image AI review through existing backend credentials, a verified-email publication gate, policy acknowledgement, review provenance and private compressed WebP database storage.
- Added approximate H3 nearby search with distance ordering, explicit location permission, public notice details, guide pages and clearly labelled noindex dummy articles.
- Refined local discovery surfaces and added interactive next-step selection to Home and Study; retained portal boundaries and reduced-motion support.
- Added Vercel/Neon migration steps, preview isolation guard, ads.txt configuration, and an isolated production-server E2E harness. Added H3-js/Sharp runtime and PGlite/socket test dependencies.
- Extended same-origin mutation checks to Study generation, assessment, feedback, contact and brief routes; added operator poster blocks and a transactional image-storage budget.
- Fixed shared sign-out/preferences network-failure handling, refreshed status after withdrawal, and validated saved-item/preference metadata so malformed requests cannot break dashboards.

## 13 October 2026 — small-platform resource limits
- Reduced default PostgreSQL pool to one connection, added connection/query deadlines, narrow 51-row marketplace retrieval and lightweight partial indexes.
- Bounded Sharp cache/threads/decode concurrency and marketplace AI review concurrency/deadline; avoid duplicate initial populated-board requests.
- Replaced constant Study polling with enqueue wakeups and adaptive idle backoff; claim one job at a time. Added a hosting/resource guide with explicit free-tier limits.
- Limited large curriculum/source-instruction caches to one path each; retained all approved source content.

- Added organiser-enabled free reservation requests, private host responses and visitor dashboard status updates; deduplicated account interest/detail-view counts, consent and abuse limits. Updated marketplace copy around direct discovery and zero platform commission, with researched business/competitor notes and additive migration 0012.

- Added India state/city and category dropdowns, structured posting/search and bounded AI multi-category tags; labelled local dummy previews, core-home brand navigation, marketplace-only header/footer routes and local-desk shortcuts. Buy Me a Coffee left disabled under the free-only requirement; migration 0013 is additive.

- Disabled production Turbopack filesystem caching after stale global CSS omitted the dropdown styles; added a production CSS regression check.

- 21 October 2026: reverified the saved implementation after interrupted sessions; refreshed test totals and browser evidence in the marketplace verification report. No production migration or deployment.

## 21 October 2026 — production audit
- Added an ordered production handbook for development, Vercel/Neon, security/moderation, SEO/content, marketing, ads/revenue and growth; corrected root hosting/subdomain guidance.
- Made Vercel prebuild read-only with configuration/schema gates, moved migration credentials to separate operator/CI steps, fixed owner URL selection and atomic migration execution, and added deployment trace/context checks.
- Hardened Journal admission and private response headers, suppressed preview indexing, expanded public sitemap discovery with bounded reads/deadline, sanitised auth failure logging and added Vercel release SHA reporting.

## 22 October 2026 — Vercel-only web deployment

- Removed Netlify configuration and legacy build-triggered schema/grant mutations; retained read-only Vercel preflight.
- Replaced the legacy host regression check with a Vercel deployment contract check.
- Expanded Vercel setup with console settings, scoped secrets, separate migrations, preview/OAuth setup, three-domain cutover, DNS/registrar retirement, troubleshooting and Vercel rollback; corrected active deployment, billing, database and mobile docs. No hosted site, DNS or subscription was changed.
