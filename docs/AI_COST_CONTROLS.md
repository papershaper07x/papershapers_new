# AI cost protection

Implemented 11 October 2026. No payment is required to use the free allowance, and no device fingerprinting or IP-based student tracking was added.

## Controls

- Five AI requests per authenticated account per UTC day, shared by paper generation and feedback submission. Reset is 00:00 UTC / 05:30 India time. Failed downstream requests consume admission. The existing atomic PostgreSQL `request_limits` counter enforces this even when `REQUEST_LIMITS_ENABLED=false`; that flag now controls only optional burst protection. All accounts, including existing Plus members, have the same daily safety ceiling. Plus priority and optional burst allowance remain subject to this ceiling.
- If the quota database is unavailable, AI requests fail closed with 503. Reading saved papers and results consumes no allowance. Clearing browser storage does not reset the server quota. Multiple accounts can bypass account quotas, but cannot bypass the shared backend call ceiling.
- The backend reserves each outbound provider call atomically in one `llm_call_budget` row before network I/O. Default site-wide limits: 20 calls per UTC day and 100 per UTC calendar month. All keys, providers, retries, generation, board verification and feedback share the row. Failed calls count; unused output is not refunded. Restarts and concurrent workers share persistent counts. Zero or negative limits pause outbound calls. Database failure prevents network calls.
- A router invocation makes at most two network attempts by default, including rotated keys and provider fallbacks. A board mock uses several invocations for generation and independent checks, so one paper can use many calls and exhaust the site allowance. Cached recovery uses no new provider call.
- Every provider gets an explicit output cap: Gemini `maxOutputTokens`, Groq `max_completion_tokens`, NVIDIA `max_tokens`. Default 8192, configurable through `LLM_MAX_OUTPUT_TOKENS`. Combined system/prompt input is limited to 60,000 characters. These limits bound workloads, not exact monetary costs or tokenised input length. Full structured papers and question-level feedback cannot reliably fit in 400 tokens; truncated JSON is rejected rather than presented as a complete paper.
- `LLM_ENABLED=false` pauses new router invocations. Redeploy/restart after environment changes. Existing saved work remains accessible; validated paper cache recovery may still be available.

## Deployment

1. Apply migrations `0005_request_limits` and `0008_llm_budget` before deploying. The web role needs SELECT/INSERT/UPDATE on `request_limits`; backend role needs SELECT/INSERT/UPDATE on `llm_call_budget` and SELECT on the migration ledger. `backend.ps1 migrate` uses the owner connection and grants backend permissions. Apply web request-limit migrations and grants in a separate trusted operator/CI step; Vercel prebuild only verifies existing schema. Do not grant one service the other's budget table unnecessarily.
2. Set the backend variables from `backend/.env.example`. Start conservatively, then adjust based on measured usage. Limits are operator configuration, never browser inputs. Changing a ceiling does not reset current counts.
3. Keep all provider keys in backend environment variables. Leave billing/checkout disabled for a free beta. No top-up fake door was implemented and no provider billing account was modified.
4. Test concurrent reservations, exhausted quotas, failed calls, restart persistence and reset boundaries before launch. SQLite automated tests cover concurrency/reset logic; production PostgreSQL permissions and migration deployment need verification in the target environment.

## Dollar budgets are a separate layer

These are hard call-count ceilings, **not a $3 guarantee**. Input, output, reasoning tokens and rates vary by model. This ledger does not estimate or reconcile currency costs, and it cannot protect leaked keys used outside this backend. Avoid promising a universal ₹0.05/request cost.

OpenAI project budgets are alert thresholds, not hard spending stops. Gemini AI Studio offers project spend caps, but its billing documentation describes approximately ten minutes of processing latency and possible overages. Configure the cap offered by the actual provider account, restrict keys and disable automatic reloading where appropriate. Do not treat any budget alert as a guarantee that a bank cannot be charged beyond a precise amount. Provider dashboard settings require account access and were not changed here.

Verified sources:
- https://help.openai.com/en/articles/9186755-managing-projects-in-the-api-platform
- https://ai.google.dev/gemini-api/docs/billing
- https://console.groq.com/docs/api-reference
- https://ai.google.dev/api/generate-content
- https://docs.api.nvidia.com/nim/reference/upstage-solar-10_7b-instruct-infer

Before any public beta involving children, review each provider's current data-use terms; low cost alone does not establish suitability for student answers.

Validation: npm build/test passed with 39 frontend tests; backend tests passed with 36 tests, including concurrent admission, restart/reset boundaries, failed-call charging, retry limits and capped payloads for all three providers. Updated allowance copy was inspected at phone, tablet and desktop widths. No paid provider request or hosted migration was run for validation.

