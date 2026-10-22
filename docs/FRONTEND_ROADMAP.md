# Front-end flow audit and improvement backlog

Reviewed 11 October 2026. This is an implementation backlog, not a claim that pending capabilities are live.

## Current journey

Study landing → class/subject/chapter selection → sign-in → study desk → generation queue → paper → attempt → feedback. Teachers have a separate host flow; students enter a shared Live Room. Membership and installation are optional branches. Nearby remains an independent portal.

Already present: social metadata, sitemap, robots, branded 404, skip link, reduced motion, contact/feedback, account protection, generation errors, local answer drafts, install guidance and a generic offline fallback. Avoid adding duplicate widgets for these.

## Priorities

| Priority | Addition | Purpose | Status / completion criterion |
| --- | --- | --- | --- |
| 1 | Searchable Study destination finder | Shorten navigation to papers, rooms, curriculum and help | Implemented in Study header; filters destinations only, supports empty results and Escape |
| 1 | Active navigation and mobile menu dismissal | Make location and next steps clearer | Implemented; links close menu and Escape returns focus to menu button |
| 1 | Aggregate traffic and funnel measurement | Learn where discovery and practice break down | Partial: first-party coarse page-request counts and operational generation/assessment events; no unique visitors or per-person funnel; dashboard remains planned |
| 1 | Operational tracing | Diagnose slow/failed generation | Implemented: request IDs, API/provider duration and status, durable queue trace and token usage in private hosting logs; see OBSERVABILITY.md |
| 1 | Performance and reliability baseline | Monitor real device loading and failures | Planned: sampled LCP, INP and CLS plus sanitised error counts, without replay; define retention and access before collection |
| 2 | Contextual first-run guidance | Explain planner → attempt → feedback | Planned: dismissible inline guidance, not blocking tours; preserve keyboard access |
| 2 | Visible save/recovery status | Reduce uncertainty during attempts | Audit existing draft flow before changing; distinguish device draft from server submission and support expired sessions |
| 2 | Share public curriculum links | Make useful discoveries easy to send | Planned: native Web Share with copy fallback and inline success/error; exclude private papers and rooms |
| 2 | Progress and achievements | Make practice more engaging | Planned: use real saved attempts, optional celebration, reduced-motion support; no invented streaks or scores |
| 3 | Small interactive practice demo | Let visitors experience the product | Planned: clearly labelled sample, no account required, educational feedback, no fabricated AI response |
| 3 | Contextual motion polish | Add character to selection and completion | Planned: restrained opacity/transform feedback with reduced-motion fallback; avoid cursor effects and scroll hijacking |

## Analytics decision

Microsoft Clarity offers free heatmaps, recordings and behaviour insights, but its current client API documentation states that it should not be used on websites/apps targeting under-18s. Study explicitly serves Classes 1–12. No Clarity script, project ID, recorder or tracking cookies were added. An age checkbox or cookie banner does not resolve that product restriction.

Sources checked:
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-api
- https://learn.microsoft.com/en-us/clarity/setup-and-installation/clarity-consent-api-v2
- https://clarity.microsoft.com/pricing

Use host aggregate traffic as an initial baseline if the deployed host provides it within the chosen plan. Counts include bots and miss some cached requests; they are not exact people counts. Evaluate a first-party aggregate collector against the site's child-user requirements before implementation. Do not claim cookie-free means no personal data: IP addresses and request logs still need minimisation and retention rules.

For an eventual collector: send only allowlisted event names, coarse route groups and outcome buckets. Do not send full URLs, queries, fragments, account IDs, names, emails, room IDs, paper IDs, answer text or keystrokes. Keep operational logs separate from product analytics. Define retention, bot filtering, rate limits, operator authentication and appropriate user/guardian choices first. Publish policy changes with the implementation. Start with a weekly report of visits, paper-start conversion, generation failures and completed attempts; label sampled or incomplete data.

Clarity could be reconsidered for a separately deployed adult business product after checking its audience and current Microsoft requirements. A route allowlist inside the student SPA is insufficient isolation because third-party scripts can remain active across client navigation.

## Verification

Build and existing tests are required. Check the finder closed/open, filtered/empty, keyboard Escape, mobile menu dismissal and overflow at phone, tablet and desktop sizes. Destination search uses local static navigation only and introduces no dependency, network collection or persistence.

Verified the changed navigation in the browser at 390px phone, 768px tablet and 1440px desktop widths, including filtering, empty results, Escape, menu dismissal and active-page state. No phone horizontal overflow was observed. The code audit covered private study routes; authenticated generation, payment and classroom journeys were not exercised during this navigation change. Existing build/test suite passed (36 tests).

