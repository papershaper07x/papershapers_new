# First-party logs and tracing

Implemented 11 October 2026. No external analytics account, session replay, browser fingerprinting or new dependency is needed. No production deployment was performed by this change.

## What you can inspect

| Event | Location | Information |
| --- | --- | --- |
| `page.request` | Next proxy / web runtime | Coarse page group and time; known prefetch requests are skipped |
| `http.request` | Study web API | Operation, response status, duration and random request ID |
| `backend.request` | Web API → backend | Backend status and duration under the same request ID |
| `http.request` | Python API | Framework route template, status, duration and request ID |
| `generation.job` | Queue worker | Queued, started, completed, failed or cancelled; queue wait and execution duration |
| `llm.attempt` | Provider router | Provider, completed/failed/blocked outcome and duration, including key retries |
| `llm.usage` | Provider response | Reported input/output/total token counts, when available |

Each JSON event has `schema: 1`, `service`, `event`, `timestamp`, and `operation`. API/provider/job events carry `requestId`. Web handlers always create their own UUID, ignoring client-supplied IDs. The authenticated backend accepts that ID; other callers receive a fresh ID. The queue stores it inside its existing job envelope so it survives restart. It is a support correlation value, never an account/session identifier or an authorization credential. Failed queued jobs return the original reference only through their existing owner-scoped status endpoint. Successful job envelopes become paper content; trace retention then follows runtime logs.

Study generation, polling, history, paper reading, assessment, result reading, paper feedback and contact APIs are wrapped. Generation and assessment errors display a support reference where the server returns one. Unexpected web handler exceptions return a generic 500 rather than exposing diagnostics. Other API families are not yet wrapped. Backend middleware covers backend HTTP requests. Server-rendered calls outside a wrapped API do not have a web correlation context.

## Where to find your logs

- Locally: web `npm run dev` terminal and backend `backend.ps1 run` terminal.
- Vercel: selected project → **Logs** for runtime events; deployment → **Build Logs** for installation/prebuild failures. Search the support UUID, `http.request`, or `study.generation`. Proxy/page logs may appear in the runtime that executes the Next proxy; verify this on the deployed adapter.
- Render: selected backend service → **Logs**. Search the same UUID to follow enqueue, worker and provider events. Our application logs provide HTTP status/duration without relying on Render's paid HTTP-request-log feature.

Official instructions: https://vercel.com/docs/logs/runtime and https://render.com/docs/logging . Retention depends on the provider plan; Render currently documents seven days for Hobby. No paid log drain is required by this implementation.

To analyse logs copied/exported from those views, put newline-delimited events in an ignored local directory, for example `artifacts/observability/export.ndjson`, then run:

```powershell
node scripts/summarize-traces.mjs artifacts/observability/export.ndjson
node scripts/summarize-traces.mjs artifacts/observability/export.ndjson <support-request-id>
```

The report groups events by service, event, operation and outcome. It shows counts, errors, mean/max observed duration and reported token totals with sample coverage. Unknown token totals are null, not zero. It ignores unrelated/unparseable lines and does not print raw log input. Merge exports from both hosts before filtering to follow the complete request. This is an offline summary, not a hosted dashboard, alert system or currency-cost estimate.

## Privacy and limits

New structured events omit IP addresses, user agents, referrers, full URLs, queries, student/account IDs, paper/room IDs, names, email addresses, answer text, contact messages, prompts, response content, credentials and exception messages. Numeric token usage is extracted without logging response payloads. Default HTTPX INFO URL logging is suppressed. The checked-in Docker/local Uvicorn commands disable raw access logging; custom hosting commands must also use `--no-access-log`.

Infrastructure providers may independently record network/access metadata; this code cannot change their retention or remove their own records. Keep logs visible only to authorised hosting team members. Use the shortest practical host retention; delete local exports after seven days unless a specific incident requires a documented extension. No application log-viewing API or public dashboard was added. Export retention is an operator runbook requirement, not an automatic filesystem deletion job.

Traffic records are **page requests, not unique visitors or exact pageviews**. Bots, reloads, framework navigation requests, caching and dropped host logs affect counts. Prefetch exclusion is best effort. Counts of generation starts/completions and assessments show aggregate activity, not a tracked individual's journey or a true cohort conversion rate. This does not measure LCP/INP/CLS or collect browser exception stacks. Provider usage metadata may be absent, including on failed calls; reported totals do not equal the complete bill. Existing provider-call reservations remain the cost-control authority.

For the user journey question, this deliberately stops short of recording children's screens or building a persistent visitor identity.

## Analytics alternatives

- **Umami:** open-source traffic/product analytics, cloud or self-hosted. Review the exact collection settings, hosting costs, data-use terms and retention before adding it. Current v3 also offers replays and distinct IDs; neither belongs in this Study baseline. https://docs.umami.is/docs
- **Plausible:** aggregate traffic dashboard with cookie-free collection. Its current data policy still describes individual event/session records and daily identifiers derived from IP/user-agent data; do not equate cookie-free with no processing. Hosted/self-hosted deployment is separate from this implementation. https://plausible.io/data-policy

Neither vendor script was installed. First-party runtime tracing is active when this code runs, with no extra external service configuration. A future traffic dashboard needs a concrete, reviewed collection contract for the student audience.

## Verification

Tests cover concurrent web request isolation, header propagation, omission of private bodies/URLs/errors, backend trusted/untrusted IDs, route template logging, durable queue references and report parsing/filtering. Provider logs are tested with mocks; no paid model call is needed. Verify both hosting log views after deploying before claiming production visibility.

Validation completed: npm test (including production build) passed with 44 frontend tests; backend tests passed with 40 tests. A real local unauthenticated Study API request returned 401 with a valid generated X-Request-ID. No production deploy or paid provider call was made. Targeted lint had no errors; it retained the existing internal window.location.assign warning in paper-attempt.tsx.

