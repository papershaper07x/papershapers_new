# Student platform production audit — 9 October 2026

## Scope and conclusion


The hardening release fixes concrete failures. The platform remains suitable for a supervised pilot rather than an unrestricted student launch until the remaining launch gates below are addressed. AI output validation proves structure and mark bounds, not academic accuracy.

## Confirmed findings and disposition

| Priority | Finding and code evidence | Disposition |
| --- | --- | --- |
| P0 | `room/[roomId]/actions.ts` issued the existing attendee cookie to any browser supplying the same roll number. | Fixed: re-entry requires the original scoped cookie; otherwise a new ID is needed. |
| P0 | `room/[roomId]/page.tsx` passed teacher answer outlines to a client component during the attempt. | Fixed: outlines removed at the server boundary. |
| P1 | Teacher assessment silently generated scores from answer length when the backend failed. | Fixed: no teacher-local scoring fallback; visible retry message, saved responses retained. |
| P1 | Backend invalid model assessment could become completeness-based marks, including nonfinite floats. | Fixed for production: retry providers on invalid structure; fail closed, never persist invalid review; explicit offline mock mode remains test-only. |
| P1 | Submitted duplicate/unknown question IDs were silently collapsed or ignored. | Fixed: reject them before scoring. |
| P1 | Teacher room creation accepted arbitrary paper IDs without validating ownership. | Fixed: fetch through owner-scoped paper contract before room creation. |
| P1 | Room creation silently selected an older matching paper when generation failed. | Fixed: explicit error; saved paper use must be a deliberate choice. |
| P1 | Submission accepted closed/waiting rooms and could overwrite a completed response. | Fixed: action checks and conditional database update require an active room and joined attendee. Repeat successful submissions preserve original responses. |
| P1 | Completed rooms could still render an unsubmitted student's test. | Fixed: show session-ended state. |
| P1 | Account signup and an educator button marked a self-declared role independently verified. | Fixed: new declarations save `verified=false`; UI explicitly says self-declared. Independent verification is still a future flow. Existing verified flags are not rewritten. |
| P1 | Login/signup and expensive generation/review had no shared request budgets. | Implemented optional PostgreSQL fixed-window limits (enable after migration): 10 auth attempts per email / 15 min, 6 generation requests per user / 10 min, 60 assessment requests per user / 10 min. These default off until `REQUEST_LIMITS_ENABLED=true` is set after migration; activation is a launch gate. They are partial abuse controls, not distributed bot prevention. |
| P1 | `class-[grade]` was a literal Next.js route, not a dynamic grade URL. | Fixed: `[classSlug]`, validated class-1 through class-12 URLs. |
| P1 | Public curriculum pages depended on ignored `data/curriculum_catalog.json` absent from deploys. | Fixed: same versioned backend catalogue used by planner; no JSON filesystem dependency. |
| P1 | Teacher generation form advertised 1–12 but hardcoded 9–12 and invalid class/subject combinations. | Fixed: available class/subject options from backend catalogue. |
| P1 | Planner, attempt submission and teacher assessment could remain stuck or throw unhandled errors after network failures. | Fixed in these flows: caught errors, visible retry state, pending state released. |
| P1 | Browser draft parse/storage errors could prevent attempt loading; expired deadline reset on refresh; tick countdown drifted in background tabs. | Fixed: validated drafts, wall-clock deadline, storage warning, expired deadline retained while draft is valid. Practice timing is advisory, not an enforced exam deadline. |
| P1 | Live Room answers were lost on refresh. | Fixed: browser draft per room/attendee and personal timer; drafts logically expire after 24 h. Physical storage cleanup is not a scheduled retention system. |
| P1 | MCQ matching compared only first four characters, selecting wrong options with common prefixes. | Fixed: compare the complete selected option, excluding optional notes. |
| P2 | Maths rendered in reader but showed raw LaTeX in attempts and review. | Fixed: reuse existing markdown/math libraries for prompts, choices and outlines. |
| P2 | Planner allowed >12 chapters despite backend limit; catalogue navigation discarded class/subject context. | Fixed: cap 12 choices; public catalogue links preselect class/subject. |
| P2 | Empty-answer attempts submitted without an explicit review step. | Added inline confirmation when questions remain unanswered and an answered/unanswered question navigator. |
| P2 | No robots/sitemap endpoints; canonical origin derived from incoming host headers. | Fixed: stable configured site origin, public sitemap, private route exclusions/noindex, invalid catalogue selections return not-found. |
| P2 | Public claim of 20-minute papers conflicted with actual 40/90 and 80/180 formats; teacher feature claims were outdated; schema checking was labelled model verification. | Fixed visible Study/home claims, teacher description and review labels. |
| P2 | Optional Clarity script could enable recording while cookie notice denied analytics. | Disabled script pending an explicit consent and privacy implementation. |
| P2 | Missing helpful study error boundary/404 and keyboard skip link. | Added retry surfaces, useful 404 links, skip target and visible focus. |
| P2 | Public Journal could query the database while prerendering and fail builds without credentials. Local audit folders could be included in TypeScript/lint globs. | Fixed: Journal explicitly renders at request time; ignored work/output directories excluded from build/lint checks. |
| P2 | No deployed revision fingerprint for frontend/backend. | Added `/api/release` and backend `/version`, with host commit environment values. |

## Dependency audit

Upgraded Next.js and matching ESLint config from 16.2.6 to 16.4.0 after npm audit reported a critical advisory. Applied compatible patch updates and deduplicated nested KaTeX through the existing patched direct version. `npm audit --omit=dev` reports zero findings after this change. Five high-severity dependency entries remain in the development-only ESLint/fast-glob/micromatch/braces chain; npm proposes a breaking downgrade of eslint-config-next, which was not applied. Do not run lint against untrusted generated glob patterns; track an upstream fix. These audit counts are a point-in-time dependency check, not a blanket security guarantee.

## Remaining production gates (not fixed by this release)

1. **Reliable long jobs and idempotency (P1):** `backendFetch` stops after 60 seconds, while the provider/key retry chain can exceed that. Add persistent generation/review jobs, job IDs, polling, cancellation and deduplication. Do not just extend browser timeouts. Network failure after a stored paper/attempt can cause repeat records on retry.
2. **Save responses before scoring (P1):** self-practice attempts are persisted after model assessment. A scoring outage retains a browser draft, not a server record. Split submitted/pending/reviewed states and retry review independently.
3. **Educator quality control (P1):** no teacher editing/approval of generated questions or marks. Implement draft approval, correction, feedback override and audit history before using output for decisions. Review syllabus/year and sampling correctness with educators.
4. **Independent teacher verification and recovery (P1):** self-declaration is now honest but not institution verification. Build an admin approval process if verified status is required. Student recovery on a new browser should use teacher-issued reset tokens, never roll-number impersonation.
5. **Concurrent room lifecycle (P1):** roll-number uniqueness is currently checked in application code; simultaneous joins can race. Add a database unique normalized room/student ID contract and deliberate migration handling of existing duplicates. Starting/closing room status needs atomic expected-state transitions; no shared official start/deadline is stored.
6. **Privacy and account lifecycle (P1):** no implemented self-service deletion/export, forgotten-password/reset-email flow, email verification or age-appropriate onboarding. Review consent, retention and minor safety with qualified guidance. Provide a real operational deletion procedure.
7. **Abuse prevention (P1):** auth budgets are per supplied email and can be bypassed across identities; account creation lacks a broader budget. Contact/community public forms and room joins need shared limits, size limits, spam controls and monitoring. Audit CSRF/origin handling for all cookie-authenticated REST writes. Never treat CORS as authentication.
8. **Deployment operations (P1):** verify live environment variables, Google callback, actual source availability, least-privilege grants, backend mock disabled, backups and restore, alerts, and cold starts. `/health` now checks actual catalogue availability, but configured providers are not a successful generation readiness probe.
9. **CI and integration coverage (P1):** existing tests mostly inspect source or simulate SQL independently of runtime paths. Add isolated PostgreSQL integration, account/room end-to-end, two-browser authorization, concurrent lifecycle and offline/reconnect tests. This release adds focused behavioural regressions but does not eliminate this gap.
10. **Accessibility (P2):** complete keyboard/screen-reader audit of radio groups, input instructions, timers, validation, focus management, nested landmarks and mobile exam navigation. A skip link and focus ring are only a baseline.
11. **Browseable examples and editorial content (P2):** publish teacher-reviewed samples before signup. Journal slug entries must be added to discovery from approved published records; the sitemap currently includes the Journal index, not every article.
12. **Search operations (P2):** verify domain ownership in Search Console/Bing, submit sitemap, inspect actual indexing, configure one canonical hostname with redirects, and test social previews. No indexing/ranking claim is made.
13. **Instrumentation (P2):** record privacy-minimal visit/start/generate/submit/review/return counts and cohort attribution. Consent and notices must match actual tracking; no analytics were introduced here.
14. **Retention (P2):** draft validation expires old drafts on access but does not physically remove untouched records. Add explicit clear-draft/logout behaviour on shared devices. Prune request-budget keys and expired sessions using a reviewed maintenance procedure.

## Test-platform comparison and product backlog

Sources checked on 9 October 2026. These are design references, not a full competitor feature/pricing survey.

| Reference | Relevant documented capability | Paper Shapers next step |
| --- | --- | --- |
| [Testmoz features](https://testmoz.com/features) and [results](https://testmoz.com/help/results) | Test distribution, autosave and a dedicated results workflow. | Durable attempt submission, exportable teacher reports, reusable reviewed paper library. |
| [Quizizz accommodations](https://support.quizizz.com/hc/en-us/articles/29285279744153-Differentiate-for-Every-Student-s-Needs-With-Accommodations-on-Quizizz) | Tailored accommodations and participant reports. | Extra-time/untimed mode, reading support, per-question class summaries without public student rankings. |
| [Khan Academy mastery challenges](https://support.khanacademy.org/hc/en-us/articles/360037494231-What-are-Mastery-Challenges) | Repeated review of previously learned skills. | Chapter history, a mistakes notebook, bookmarks/flags, targeted retry sets and a transparent next-practice suggestion. |

Order after launch gates: reviewed sample paper → teacher approval/editing → persistent job/submission recovery → persistent review flags → teacher class/question reports and CSV → chapter progress and targeted retry → optional notifications and learner goals. Avoid spending the first release on badges, chat, leaderboards or native apps.

## Verification evidence

- Next.js 16.4.0 production build and `npm test`: 21 frontend/structure/draft tests passed.
- Public pages, self-practice attempt/results, teacher monitor and Live Room attempt checked at 360, 768 and 1440 pixels with no horizontal document overflow. Screenshots reviewed; inherited metadata styles leaking into question controls were corrected.
- Real local browser flow with shared PostgreSQL and explicit mock model: signup → generation → MCQ selection → refresh draft recovery → expired timer reload → failed submission retry → result → saved-paper room creation. No JavaScript page errors in that flow.
- Two student browsers: duplicate student ID returns a visible error and no attendee cookie; original browser resumes; answer outlines absent from rendered student props; after teacher closes a room, submission is rejected and the draft is retained.
- These checks use local services and mock model output. Production OAuth, real-model correctness/latency, live infrastructure and enabled rate-limit migration are not established by them.

## Deployment and re-verification

Frontend and backend live in one repository. A single source commit must deploy to both Netlify and Render. Compare Netlify's deployed commit with `/api/release`, and Render's commit with `/version`. A Git push alone does not prove deployment succeeded.


Check `/robots.txt`, `/sitemap.xml`, `/syllabus`, `/syllabus/class-10` and a returned subject URL. Then verify sign-in, paper generation, reload recovery, submission/review, teacher room creation, two browsers with duplicate IDs, closed-room rejection and a second teacher attempting another teacher's paper ID. Confirm `ALLOW_MOCK_FALLBACK=false` on Render.
