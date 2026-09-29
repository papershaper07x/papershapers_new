# Study Lab portal

## Product boundary

Study Lab helps learners and educators configure focused practice, turn their own material into active revision, and organise research. It owns educational content and generation workflows; it does not own general news or local advertising.

## Current experience

- Navy-and-gold academic workbench with graph-paper texture and paper-sheet motifs.
- Public product story; authentication becomes mandatory only when a learner creates a paper brief.
- Interactive subject, class, chapters, and half/full-paper brief; signed-in requests generate a structured paper and open it on its own route.
- Dedicated paper reader at `/papershapers/papers/:paperId`, focused test surface at `/papershapers/papers/:paperId/attempt`, and formative results at `/papershapers/papers/:paperId/attempts/:attemptId`.
- Result review keeps the original question, submitted response, formative feedback, and a collapsible answer outline together. Older attempts created before this field was stored disclose that limitation instead of inventing a question.
- A dedicated planner at `/papershapers/tests/new` reads the installed Paper Shapers source data for the supported Class 9–12 subjects and their actual chapter entries; it does not invent a general catalogue.
- Private dashboard at `/papershapers/dashboard` with generated-paper library, request history, and a sample revision rhythm.
- Future-tool cards for document questions, research mapping, and revision planning.
- A visible rule-based Study Guide with student next-step prompts, FAQ answers, and a teacher/coaching-class pilot path. It is not an LLM chat and does not send free-form student questions to a model.
- Generated papers include browser-native Print / save as PDF and private paper feedback. Feedback is stored for human product review; it does not automatically alter prompts, papers, or marks.
- Study uses a portal-specific header/footer, useful workflow and educator sections, and structured page metadata. These explain the real product flow rather than making unsubstantiated SEO claims.
- The Study navigation points to standalone How it works, Study guide, For teachers, and Contact & feedback routes, so it works from the dashboard and future paper routes rather than only as a landing-page anchor.
- Contact & feedback accepts product, school, coaching, and partnership notes through a public, validated form. Sample feedback cards are labelled illustrative; they are not real testimonials.
- Privacy and terms pages describe the current free-study, data, and no-active-advertising position. They should be reviewed for the final launch jurisdiction and any ad provider before publishing.

## Authentication and data

Study is the strictest portal: generation, paper viewing, and attempts require a signed-in user. D1 stores user-facing request history while the local backend stores structured papers and attempts in SQLite. The current source boundary accepts imported, approved curriculum metadata/context only; it does not fetch, copy, or re-host official textbook PDFs. Current output and score feedback are reviewable prototypes, not certified curriculum material or official examination results.

Contact messages are stored in D1 with only the name, reply email, selected role/topic, message, and timestamp needed to respond and improve the product. They are public-form submissions, not learner-study records, and must not be used as testimonials without direct permission.

## Planned backend contract

The web routes enforce the session and proxy to versioned backend contracts: `POST /api/study/generate`, `GET /api/study/catalog`, `GET /api/study/papers`, `GET /api/study/papers/:paperId`, and attempt POST/GET routes. Generation validates selections against the installed source and uses an explicitly configured Gemini/Groq/NVIDIA server-side sequence; it fails without saving template content when no configured model produces a paper matching the requested blueprint. An unexpired shared cache is recovery-only after all providers fail and always creates a private paper record for the requesting learner. Attempts have a paper-derived timer, local draft autosave, progress count, and clearly labelled formative feedback. Model responses are checked against the generated paper's question IDs and mark caps before display; this validates output shape, not academic correctness. The next scale step is an idempotent job API for slow generation and approved-document retrieval.

`POST /api/study/papers/:paperId/feedback` proxies owner-scoped feedback to the local API. The backend stores the category/comment separately from paper content and attempts. Feedback is a human-review signal for future prompt and product changes, never automatic live training data. The school/coaching pilot link uses the established Paper Shapers contact address; `STUDY_CONTACT_EMAIL` can override it for a specific deployment.

## Research boundary

The copied reference project included a web researcher but embedded a third-party key and did not retain source provenance safely, so it is not active. The future Research Mapper must use an explicit provider key, preserve citations/date/source, and present retrieved material as study context rather than an answer authority.

Before launch: source curriculum material legally, validate generated answers, rate-limit jobs, scan uploads, add retention controls, and test outputs with educators.
