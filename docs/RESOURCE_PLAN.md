# Small-platform resource plan

## Changes implemented
- Next/PostgreSQL defaults to one connection per instance, 10-second connect/query ceilings and 10-second idle release. DATABASE_POOL_MAX may be set to 1–5 after measurement. Use Neon's pooled runtime URL; owner migrations use the direct connection. A per-instance limit is not a site-wide limit when serverless instances scale out.
- Marketplace queries narrow IDs, perform distance filtering/order in SQL, and load only 51 records (50 visible plus a has-more signal). Previously up to 501 bodies were read and 500 filtered in JavaScript. Migration 0011 adds small partial indexes for public recency and pending Study jobs. Keyword substring search remains a pilot-scale scan when searching many notices; introduce measured full-text/trigram indexing later rather than adding an extension now.
- A populated server-rendered board no longer repeats its initial query in the browser. Interactive search still fetches fresh results. Guides are static pages; images are lazy-loaded. Private/session/search/media responses are not turned into unsafe blanket CDN caches.
- Image processing admits one job per web instance, uses one Sharp thread, disables its operation cache and caps server decoding at four million pixels (down from sixteen million). The browser resizes before upload. Excess work returns a short retry response instead of building an in-memory queue. Stored outputs remain ≤250 KB with a 50 MB compressed-payload budget. PostgreSQL overhead/backups are additional.
- Marketplace AI review admits one call per backend process and has an 18-second endpoint deadline, below the web's 20-second review deadline. Busy/failed reviews remain pending. Existing provider retry and global spending limits remain in force. Study generation still has its own existing request/queue limits.
- Study claims only one runnable/expired-lease job rather than loading 100 queued JSON bodies. Idle polling backs off from two seconds to ten minutes. Enqueue on this backend wakes its worker immediately via a thread-safe event. Polling eventually leaves time for Neon scale-to-zero. Jobs committed by another process or after a crash may wait up to the fallback interval; use one API/worker process for this small pilot. Do not deploy multiple independent worker replicas without reviewing wakeup and queue latency.
- Python PostgreSQL connections close after each transaction and now have connection/query time limits. No new pool service, Redis, Kafka, model runtime or browser mapping SDK is introduced.

These are bounds and reduced work, not a guarantee that any free plan can handle unlimited traffic. Measure RSS, CPU, cold-start latency, image-busy responses, review backlog, database storage and connections on the actual host before increasing limits.

## Practical service split
| Responsibility | Current recommendation | Tradeoff |
| --- | --- | --- |
| Next pages and authenticated APIs | Existing Vercel migration target | Hobby is non-commercial; monetised launch needs an eligible commercial plan. Keep owner credentials build-only. |
| Shared identity, Study state, marketplace data | Neon pooled PostgreSQL | One database, separate tables; free quotas and scale-to-zero. Preview branch isolation is mandatory. |
| Python AI calls and durable Study queue | Current backend service, one process | Free web hosts may sleep/restart; durable jobs resume after wake. No guaranteed always-on worker at zero cost. |
| Static guides, CSS, fonts and public assets | Hosting CDN already included | Optional Cloudflare DNS/CDN can be added later; avoid a new proxy just for the sake of splitting services. |
| Approved media if the pilot store grows | Evaluate private object storage then | Keep current bounded database store now. Private quarantine, signed access and approved-only serving are required before migration. |
| Heavy generation | Existing external AI APIs | No local model weights/GPU/RAM. Provider quotas can stop reviews; pending is the safe fallback. |

Neon documentation describes its pooling and scale-to-zero behaviour: https://neon.com/docs/manage/endpoints/ . Render free web services sleep after 15 minutes without inbound traffic and can restart; they are unsuitable for a promise of an always-on free worker: https://render.com/docs/free . Ordinary application cold starts must be handled with retry/queue status; do not rely on artificial keepalive requests to defeat host limits.

Cloudflare Workers have strict CPU/resource ceilings on free plans; do not move native Sharp processing or the Python durable worker there as an unchanged deployment. It is a possible future home for small edge routing/static work, not an automatic replacement for this stack: https://developers.cloudflare.com/workers/platform/limits/ . Vercel commercial rules remain applicable: https://vercel.com/docs/plans/hobby . Sharp thread/cache controls follow its official API: https://sharp.pixelplumbing.com/api-utility/ .

## Optional next steps, when evidence warrants them
1. Deploy the existing three-service split first and collect a representative memory/latency trace. Set host spend caps/alerts where available, plus image-storage and provider-budget limits already implemented.
2. Use a nearby region for Vercel functions, Neon and the backend to reduce network wait. Verify currently available regions in the actual provider accounts rather than assuming a free region feature.
3. Apply a written media retention/deletion policy before increasing storage. Move approved media to private object storage only after a measured need; do not scatter user databases across vendors to evade quotas.
4. If sleep/recovery latency becomes unacceptable, document an always-on requirement and budget for it, or deliberately redesign the durable worker around a supported event/queue service. There is no completed queue migration in this change.
5. Configure CDN/DNS protections only after testing OAuth, shared cookies, no-store responses and domain routing. Never cache private dashboards, APIs or moderation-dependent media with a cache-everything rule.

## Validation and limits
Automated tests cover image admission-slot release, worker backoff/thread wakeup, busy AI review rejection, search correctness and the existing Study queue lifecycle. The local HTTP/database harness continues to run on isolated PGlite; production Neon locking, role grants, cloud RSS/CPU, cold starts and distributed concurrency remain unverified until those environments are configured.

The image table also has a hard 1,000-image admission ceiling, including pending/expired records, so tiny images cannot evade the payload budget while accumulating excessive row/index overhead. Capacity exhaustion requires operator retention/deletion work or a documented storage migration; it never silently enables paid storage.

The installed compatibility curriculum CSV is about 43 MiB. Curriculum/source-instruction LRU caches now retain one source path each rather than four, limiting redundant corpora. Content is preserved; no learning material is deleted or silently truncated. Use the approved indexed curriculum store where installed. Measure process RSS separately because Python heap traces do not include native libraries or all host memory.

Local measurement (13 October 2026): loading the installed catalogue with Python tracemalloc retained about 69.9 MiB of traced Python heap, with a 69.9 MiB traced peak. This is measured local catalogue allocation, not total backend RSS, native memory or a cloud capacity promise. Do not infer a host's maximum traffic from it.

### Reservation pilot bounds
No new runtime dependency, payment service, background job or notification polling. One account row per notice caps duplicates. Per notice, at most 1,000 lifetime reservation records and 5,000 engagement records are admitted under a parent-row lock. Quotas are 120 engagement attempts/hour and 20 reservation attempts/day per account. Index-supported public aggregates apply to the existing 12/51-row catalogue page; visitor/organiser inboxes load 50 rows each. These are per-notice controls, not a global storage guarantee: monitor total notice/table growth and implement documented retention before traffic expands. Existing global pool defaults remain one connection per instance.

Structured search adds only static region presets and a <=3-label SQL array per notice, with one region index. Classification reuses the existing safety call. Dummy preview is a small code-owned dataset filtered in the browser, never a production seed or another backend request. No geocoder, maps SDK, taxonomy service, ad SDK or contribution SDK was added.

Production build caching is disabled for correctness after stale CSS was observed; this trades a slightly longer cold compile for avoiding stale UI and persistent build-cache writes. Runtime database/memory limits are unchanged.

## Production audit controls
Vercel uses read-only build preflight with the restricted runtime connection; migrations occur outside web builds. The deployment trace audit has a conservative 200 MiB review threshold and rejects private/backend source inclusion, but measures local traces only. Public discovery caps SQL rows and gives curriculum fetch five seconds. Journal admission is byte/rate bounded. No new runtime dependency, geocoder, ad SDK or worker service was added. Actual Linux function size, aggregate serverless connection use, host RSS and cold-start/load behavior remain staging evidence requirements.
