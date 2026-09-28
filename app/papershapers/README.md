# Study Lab portal

## Product boundary

Study Lab helps learners and educators configure focused practice, turn their own material into active revision, and organise research. It owns educational content and generation workflows; it does not own general news or local advertising.

## Current front-end

- Responsive product story and sample question sheet.
- Interactive subject, class, and intent brief.
- Honest handoff state that labels backend generation as the next phase.
- Future-tool cards for document questions, research mapping, and revision planning.

## Planned backend contract

`POST /v1/study/jobs` accepts curriculum, class, subject, chapters, intent, duration, and optional private document references. It returns a job ID. `GET /v1/study/jobs/:id` returns status and, when complete, a versioned structured paper and answer key.

Before launch: source curriculum material legally, validate generated answers, rate-limit jobs, scan uploads, add retention controls, and test outputs with educators.
