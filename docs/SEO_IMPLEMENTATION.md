# SEO implementation and verification

Implemented locally on 23 October 2026 following [the production audit](SEO_AUDIT_2026-10-23.md). Deployment is separate; the audit preserves the earlier live state.

## URL ownership and metadata

`lib/seo.ts` owns public URL classification, canonical metadata and intentional navigation links. Set the three `NEXT_PUBLIC_*_ORIGIN` values from the root README at build time. Public Study pages belong on the Study subdomain; Nearby pages belong on the marketplace subdomain; curriculum and legal pages belong on the root domain. Local links stay relative when origins are not configured.

The proxy permanently redirects GET/HEAD aliases of known public routes, including subdomain roots and the supported www alias. It preserves query strings and does not redirect unknown/preview hosts, API requests, POST requests, authentication or private workflows. Pages declare their own canonical, Open Graph and Twitter metadata; no shared layout canonical is inherited by unrelated routes. Cross-origin sign-in behavior is unchanged.

Root copy names both products. Organization/WebSite JSON-LD identifies the brand; the existing Study application references its organization ID. No reviews, prices, endorsements or fictional businesses were added. Public Apple titles identify their portal. Manifest identity is selected using the configured host; local shared-host development uses the umbrella manifest.

## Sitemaps and curriculum

- `/sitemap.xml` remains a consolidated public URL list for Search Console.
- `/sitemaps/home.xml`, `/sitemaps/study.xml` and `/sitemaps/nearby.xml` contain the corresponding site's routes. Each production host's robots file advertises its own file. Robots-based cross-submission no longer depends on a mixed-host sitemap.
- A bounded live catalogue request supplies class/subject paths. On failure or an empty response, a bundled 103-path installed-source snapshot keeps discovery available on cold serverless instances. Fallback emits a controlled `sitemap.curriculum_fallback` event without identities or secrets.
- Refresh the snapshot whenever source class/subject availability changes, especially removals; review its diff and deploy web/backend together:

  ```powershell
  python scripts/export-seo-curriculum.py
  ```

  An alternate approved CSV can be supplied as the first argument. This reads the installed source without scraping, generation or database mutation. These paths describe installed material, not certified current-year CBSE coverage.

- Notice approval, expiry and poster eligibility remain authoritative. Only published journal posts enter discovery. Private, pending and dummy content stays excluded; notices and student posts are never supplied from an offline snapshot.

Chapter labels are recovered from explicit numbered `CHAPTER` headings in stored textbook text and sorted numerically. Original source strings/database records are preserved; older saved briefs remain aliases for the same context. Unrecoverable figure/activity labels are marked as pending review instead of invented. Future scraper ingestion uses the same parser. This does not certify every subject's labels or examination coverage; review representative PDFs when installing material.

## Indexing boundaries

Public account entry pages can now be crawled so their existing noindex metadata/headers can be read. `/api/` stays disallowed. Authentication, private no-store/noindex responses and preview-wide exclusions remain in force. Robots files are not access controls. Preview sitemaps remain empty without database reads.

## Repeatable verification

```powershell
npm run build
npm test
npm run backend:test
node scripts/audit-seo.mjs http://localhost:3000 work/seo-verification.json
```

The read-only crawler checks every sitemap entry (bounded to 1,500 URLs, three workers), status, canonical agreement and accidental noindex. On localhost it requests paths locally instead of visiting production canonicals. It does not log in, generate papers, submit forms or spend provider calls. Once deployed, supply `https://papershapers.in` to check the real sitemap's preferred hosts. The optional final argument writes JSON evidence. Durations are request observations, not Core Web Vitals.

Also verify per-host robots/manifests, redirects with query strings, unchanged private POST/API behavior, dummy-guide noindex, JSON-LD and social-image availability. Check root/Study/Nearby layouts at 390, 768 and 1440 pixels after visible-copy changes.

## External acceptance

1. Deploy web and backend changes. Local results do not update production or search results.
2. In a verified Search Console Domain property, submit the consolidated sitemap or per-site files. Inspect representative portal, curriculum and journal URLs; record Google-selected canonicals, last crawl, indexing reasons and intended account-page exclusions. Review manual actions/security reports. No Search Console account was connected for this implementation.
3. Collect mobile/desktop PageSpeed lab runs and available CrUX/Search Console field data for root, both portal landings and a curriculum page. Save LCP/INP/CLS evidence; this crawler and local layout checks do not measure field performance.
4. Research real query demand before creating chapter clusters. Keep material source-reviewed and useful; avoid bulk thin pages, invented keyword volumes or rich-result guarantees. FAQs can help readers, but Google FAQ rich results are retired as of this audit date.

Reference guidance: [canonicals](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), [sitemaps](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap), [noindex](https://developers.google.com/search/docs/crawling-indexing/block-indexing), and [Google documentation updates](https://developers.google.com/search/updates).
