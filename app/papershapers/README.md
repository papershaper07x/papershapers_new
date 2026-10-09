# Study Lab portal

## Product boundary

Study Lab helps learners and educators configure focused practice, turn their own material into active revision, and organise research. It owns educational content and generation workflows; it does not own local advertising.

## Current experience

- Navy-and-gold academic workbench with graph-paper texture and paper-sheet motifs.
- Public product story; authentication becomes mandatory only when a learner creates a paper brief.
- Interactive subject, class, chapters, and half/full-paper brief; signed-in requests generate a structured paper and open it on its own route.
- Dedicated paper reader at `/papershapers/papers/:paperId`, focused test surface at `/papershapers/papers/:paperId/attempt`, and formative results at `/papershapers/papers/:paperId/attempts/:attemptId`.
- Added **Live Rooms** functionality for teachers: Self-declared educators can host test sessions at `/papershapers/for-teachers/rooms` using full CBSE syllabus options (Classes 1–12, subjects, and paper sizes), their saved library, or custom IDs. Students join via `/papershapers/room` or `/papershapers/room/:roomId` with name and roll number.
- **Educator Verification Layer:** Hosting live rooms is restricted to declared educator accounts (`user_roles` table). Student accounts can declare an educator role; this is not independent affiliation verification before creating sessions.
- **Persistent Chrome & Navigation:** Restored `<SiteHeader>` and `<SiteFooter>` across all deep live room routes (`/for-teachers/rooms`, `/for-teachers/rooms/:roomId`, `/room`, `/room/:roomId`), ensuring seamless cross-portal navigation and brand consistency.
- **Enhanced Question Visualization:** Paper attempt views feature dedicated question input formats: interactive selectable option tiles with radio indicators for MCQs, concise single-line inputs for short/fill-in-the-blank questions, and structured textareas for descriptive problems.
- **Educator Review Deck & AI Assessment:** Redesigned student responses into clean attendee cards with live status chips, score metrics, and an on-demand **Run AI Assessment** button. The AI evaluation calculates total marks, percentage, and detailed question-by-question feedback comparing student answers against expected rubrics.
- **Formative Assessment Disclaimers:** Visible disclaimers across umbrella and study homepages, live room review decks, and AI evaluation cards emphasize that AI evaluations and mock tests are educational practice estimates to assist teachers, not official CBSE examination marks.
- The paper reader keeps each question on its own visual block: a compact Q-number, section, type, chapter, and marks line comes before the readable question text. Result review keeps the original question, submitted response, formative feedback, and a collapsible answer outline together. Older attempts created before this field was stored disclose that limitation instead of inventing a question.
- A dedicated planner at `/papershapers/tests/new` reads the installed Paper Shapers source data for the supported Class 1–12 subjects and their actual chapter entries; it does not invent a general catalogue.
- Private dashboard at `/papershapers/dashboard` with the four newest generated papers, linked request history, a separate paginated archive at `/papershapers/papers`, and a sample revision rhythm. New request-history records retain their generated paper ID so learners can reopen the exact paper from either surface; legacy records without that link are visibly labelled as unavailable rather than guessed.
- Future-tool cards for document questions, research mapping, and revision planning.
- A visible rule-based Study Guide with student next-step prompts, FAQ answers, and a teacher/coaching-class pilot path. It is not an LLM chat and does not send free-form student questions to a model.
- Generated papers include browser-native Print / save as PDF and private paper feedback. Feedback is stored for human product review; it does not automatically alter prompts, papers, or marks.
- Study uses a portal-specific header/footer, useful workflow and educator sections, and structured page metadata. These explain the real product flow rather than making unsubstantiated SEO claims.
- The Study navigation points to standalone How it works, Study guide, For teachers, and Contact & feedback routes, so it works from the dashboard and future paper routes rather than only as a landing-page anchor.
- Contact & feedback accepts product, school, coaching, and partnership notes through a public, validated form. Sample feedback cards are labelled illustrative; they are not real testimonials.
- Journal is a public reading shelf at `/papershapers/journal` with clearly attributed Paper Shapers starter guides. Signed-in users may submit a study note at `/papershapers/journal/new`, but it is stored as `pending` for editorial review and cannot appear publicly without an explicit future approval action.
- A small, non-product dedication route at `/papershapers/dedication` carries the paper-note visual language and credits Harsh Kushwaha (Project Lead & System Architect) and Ankit Varshney (Frontend Architect). It does not collect visitor data or imply that either credit is a public user testimonial.
- Privacy and terms pages describe the current free-study, data, and no-active-advertising position. They should be reviewed for the final launch jurisdiction and any ad provider before publishing.
- The shared account screen also supports a Google authorization-code sign-in when its three server-only environment values are configured. It stores a verified Google identity link, not provider access tokens, and creates the same Paper Shapers session used by Study.

## Authentication and data

Study is the strictest portal: generation, paper viewing, answer outlines, attempts, results, and paper feedback require a signed-in user. The browser routes redirect anonymous visitors to sign-in and the same-origin API rejects anonymous requests; the backend also requires a separate server-to-server shared secret, so its private paper routes cannot be called directly without both boundaries. PostgreSQL stores account, request, paper, attempt, feedback and room records; the web and API services use separate runtime roles. The current source boundary accepts imported, approved curriculum metadata/context only; it does not fetch, copy, or re-host official textbook PDFs. Current output and score feedback are reviewable prototypes, not certified curriculum material or official examination results.

Contact messages are stored in PostgreSQL with only the name, reply email, selected role/topic, message, and timestamp needed to respond and improve the product. They are public-form submissions, not learner-study records, and must not be used as testimonials without direct permission.

Journal submissions store the account ID, first-name byline, supplied title/summary/body, and a pending state. They are moderated editorial submissions, not real-time forum messages; they must never publish automatically, expose learner assessment data, or accept private contact details. The local-first and Netlify migration boundary is documented in `docs/NETLIFY_HANDOFF.md`.

Live Rooms bridge teachers and students without adding account hurdles for students: hosting requires an authenticated teacher account (`teacher_id`), but student attendees join friction-free with only their name and roll number. A scoped HTTP-only session cookie (`attendeeId_{roomId}`) isolates each student session and prevents submission tampering across participants. Stored attendee records track status (`joined` vs. `completed`), question-by-question responses, and timestamps. Room queries and controls (starting the session, live attendance monitoring, and concluding rooms) are strictly owner-scoped to the hosting teacher.

## NCERT Textbook Scraper, Multi-Grade Scaling & Tabular Curriculum Store

To keep CBSE and NCERT curriculum coverage synchronized with official textbooks from primary to senior secondary stages:
- `scripts/ncert_curriculum_scraper.py` queries `https://ncert.nic.in/textbook.php`, discovering 1,149 official book titles, codes, and chapter counts across Classes 1 through 12.
- **Scalable Across Classes 1–12:** Supports targeting specific classes (`--classes 1 5 10 12`) or the entire spectrum (`--classes all`), covering English, Hindi, Urdu, and regional languages.
- **Clean Folder Hierarchy:** Downloads raw chapter PDFs into an organized directory structure: `data/ncert_pdfs/Class_{XX}/{Subject}/{Book_Title}/Chapter_{YY}_{code}.pdf`, making it simple for educators and auditors to inspect PDFs directly in Windows Explorer.
- **PyMuPDF Text Extraction:** Extracts clean, chapter-level text via PyMuPDF (`fitz`), stripping boilerplate publication disclaimers and page numbering.
- **Modern Tabular SQLite Store:** Saves structured data to `data/curriculum_store.sqlite` with indexed queries on `(grade, subject)` and chapter counts.
- **Hierarchical JSON Catalog:** Exports `data/curriculum_catalog.json` for frontend and in-memory caching.
- **Local CSV Sync:** Updates `data/study-source/text_files_data2.csv` for the active backend. This imported source stays local and is intentionally excluded from Git.
- **Dedicated Integrity Validator:** Built `scripts/validate_curriculum_extraction.py` and `--validate` flag, allowing educators to cross-verify database text against source PDFs with 100% text match confidence checks.
- **Automated Recurrence:** Semi-annual 6-month recurrence via cron (`0 0 1 */6 *`) or Windows Task Scheduler, alongside manual on-demand triggers (`--run-now`, `--sample`).


## Planned backend contract

The web routes enforce the session and proxy to versioned backend contracts: `POST /api/study/generate`, `GET /api/study/catalog`, `GET /api/study/papers`, `GET /api/study/papers/:paperId`, and attempt POST/GET routes. Generation validates selections against the installed source and uses an explicitly configured Gemini/Groq/NVIDIA server-side sequence; it fails without saving template content when no configured model produces a paper matching the requested blueprint. An unexpired shared cache is recovery-only after all providers fail and always creates a private paper record for the requesting learner. Attempts have a paper-derived timer, local draft autosave, progress count, and clearly labelled formative feedback. Model responses are checked against the generated paper's question IDs and mark caps before display; this validates output shape, not academic correctness. The next scale step is an idempotent job API for slow generation and approved-document retrieval.

`POST /api/study/papers/:paperId/feedback` proxies owner-scoped feedback to the local API. The backend stores the category/comment separately from paper content and attempts. Feedback is a human-review signal for future prompt and product changes, never automatic live training data. The school/coaching pilot link uses the established Paper Shapers contact address; `STUDY_CONTACT_EMAIL` can override it for a specific deployment.

## Research boundary

The copied reference project included a web researcher but embedded a third-party key and did not retain source provenance safely, so it is not active. The future Research Mapper must use an explicit provider key, preserve citations/date/source, and present retrieved material as study context rather than an answer authority.

Before launch: source curriculum material legally, validate generated answers, rate-limit jobs, scan uploads, add retention controls and an end-to-end deletion process, configure the Google callback on the final domain, and test outputs with educators. The complete owner checklist is [docs/LAUNCH_READINESS.md](../../docs/LAUNCH_READINESS.md).

## Production hardening and remaining work

Read [the complete student audit](../../docs/STUDENT_PLATFORM_AUDIT.md). Live Rooms now protect browser-scoped attendee recovery, check paper ownership and room status, exclude answer outlines from student props and retain browser drafts. Self-practice drafts use validated wall-clock deadlines and storage failure warnings. Both attempt modes include an answered/unanswered question navigator and confirmation before submitting incomplete work. Public curriculum routes use the backend catalogue, and generation choices preserve subject/class context. Production review never silently substitutes answer-length scoring. Optional shared request budgets require migration `0005_request_limits.sql` and `REQUEST_LIMITS_ENABLED=true`; they default off to preserve existing deployments. Deployed frontend/backend commit identifiers support verification. This remains a supervised pilot; durable jobs, teacher approval/editing, account recovery/deletion, accessibility and operational launch gates remain.

## Scientific question content
Papers retain JSON structure with Markdown/LaTeX text, mhchem chemical equations, and optional validated version-1 diagrams. Supported diagrams include series/parallel resistor and capacitor circuits, uniform fields, and directed flow relationships. Reading, attempts, Live Rooms, review and print share the renderer. See `docs/QUESTION_CONTENT.md` for the contract and limits. Older papers remain compatible; new diagrams require new generation.

## Interface details
The planner uses five fieldsets with pressed-state buttons, chapter selection feedback and a live summary. Generation disables its controls and reports progress inline; errors keep the selections for retry. Source details are expandable. Full-paper copy explicitly distinguishes chapter practice from a verified board mock. Study typography balances headings, improves paragraph wrapping and provides generous reading line heights. Local SVG action icons require no added dependency. Paper actions distinguish printing from returning to already saved papers.

## Interface references
The Study refinements follow plain, specific copy principles reviewed in [Humanizer](https://github.com/blader/humanizer), with [Superdesign](https://github.com/superdesigndev/superdesign) and [Better Icons](https://github.com/better-auth/better-icons) reviewed as design resources. The implementation uses existing CSS and local SVG icons, with no new packages or external runtime services. Responsive browser checks use explicitly labelled test fixtures, not live curriculum claims.

## Background paper generation
The planner posts a short request that returns a generation job (HTTP 202), then polls its owner-scoped status every five seconds. Questions run on the FastAPI host rather than inside the web request. Transient polling outages do not submit another generation. Finished papers appear in the archive even if the browser closes. If the wait exceeds the polling window, check saved papers before creating another. HTML gateway responses show a useful error instead of raw JSON parser output.

## Board mock drafts — Maths 2026–27
The planner supports Class 10 Mathematics Standard and Class 12 Mathematics (041) as separate board-mock drafts. Both use 38 questions, 80 marks and 180 minutes, with subject/session-specific OR rules and exact unit budgets from the official curriculum. Chapter allocation within units is our template, not an official chapter weighting. Chapter practice remains available independently.

Slots fix question IDs, types, marks, chapters, topic requirements, case-study subparts and choices before generation. Four-question groups use topic-ranked chunks across full installed NCERT chapters. Structural/resource checks and a separate model solve/check pass reject invalid drafts; affected slots receive up to two repair calls. No illustrative fallback can be published as a board mock. Full source coverage is required; ambiguous Part II file numbering is resolved using textbook section numbers.

Readers, timed attempts and printing share the stored JSON. Readers show options, OR questions and case-study parts; attempts select one OR branch and persist nested responses in the existing draft store. Student responses do not receive keys or marking schemes. Operator review bundles include solutions and step credits. All drafts display educator-review-pending; a model check does not establish educator approval or guaranteed mathematical correctness.

Reference profiles: [X SQP](https://cbseacademic.nic.in/web_material/SQP/ClassX_2026_27/MathsStandard-SQP.pdf), [XII SQP](https://cbseacademic.nic.in/web_material/SQP/ClassXII_2026_27/Maths-SQP.pdf), [X curriculum](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart1/Maths_SecP1X_2026-27.pdf), [XI–XII curriculum](https://cbseacademic.nic.in/web_material/CurriculumMain27/SecPart2/Maths_SecP2_2026-27.pdf).

Board figures remain horizontally scrollable within narrow readers; printing removes shared site navigation. Generation rejects invalid figures rather than publishing incomplete papers.
