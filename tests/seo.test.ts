import test from "node:test";
import assert from "node:assert/strict";

process.env.NEXT_PUBLIC_HOME_ORIGIN = "https://papershapers.in";
process.env.NEXT_PUBLIC_STUDY_ORIGIN = "https://study.papershapers.in/papershapers";
process.env.NEXT_PUBLIC_MARKET_ORIGIN = "https://marketplace.papershapers.in/noticeboard";
const { canonicalUrl, pageMetadata, publicRedirect, siteHref } = await import("../lib/seo");

test("public aliases converge without redirect loops or moving private workflows", () => {
  for (const path of ["/papershapers", "/papershapers/how-it-works", "/papershapers/journal/a-note"]) {
    const target = publicRedirect("papershapers.in", path);
    assert.equal(target, `https://study.papershapers.in${path}`);
    assert.equal(publicRedirect("study.papershapers.in", path), null);
  }
  assert.equal(publicRedirect("study.papershapers.in", "/"), "https://study.papershapers.in/papershapers");
  assert.equal(publicRedirect("marketplace.papershapers.in", "/"), "https://marketplace.papershapers.in/noticeboard");
  assert.equal(publicRedirect("www.papershapers.in", "/privacy"), "https://papershapers.in/privacy");
  for (const path of ["/auth", "/api/study/papers", "/papershapers/tests/new", "/papershapers/journal/new", "/papershapers/papers/123", "/noticeboard/dashboard", "/noticeboard/post"]) {
    assert.equal(publicRedirect("papershapers.in", path), null, path);
  }
  assert.equal(publicRedirect("preview.example.test", "/papershapers"), null);
  assert.equal(publicRedirect("localhost:3000", "/papershapers"), null);
  assert.equal(publicRedirect("study.papershapers.in", "/syllabus/class-10/science"), "https://papershapers.in/syllabus/class-10/science");
});

test("metadata and navigation preserve the preferred portal including URL fragments", () => {
  assert.equal(siteHref("/papershapers#plans"), "https://study.papershapers.in/papershapers#plans");
  assert.equal(siteHref("/noticeboard#board"), "https://marketplace.papershapers.in/noticeboard#board");
  const metadata = pageMetadata("/papershapers/journal/a-note", "A note", "A useful note.");
  assert.equal(metadata.alternates?.canonical, canonicalUrl("/papershapers/journal/a-note"));
  assert.equal(metadata.openGraph?.url, metadata.alternates?.canonical);
  assert.equal(metadata.twitter?.title, "A note");
  assert.equal(metadata.appleWebApp && typeof metadata.appleWebApp === "object" && metadata.appleWebApp.title, "Study");
});

test("proxy preserves query strings and only redirects GET/HEAD public aliases", async () => {
  const { NextRequest } = await import("next/server");
  const { proxy } = await import("../proxy");
  const response = proxy(new NextRequest("https://papershapers.in/papershapers/how-it-works?source=home"));
  assert.equal(response.status, 308);
  assert.equal(response.headers.get("location"), "https://study.papershapers.in/papershapers/how-it-works?source=home");
  assert.equal(proxy(new NextRequest("https://papershapers.in/papershapers", { method: "POST" })).status, 200);
});

test("cold sitemap fallback keeps curriculum discovery and excludes private/example routes", async () => {
  const previousFetch = globalThis.fetch;
  const previousDatabase = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  globalThis.fetch = async () => { throw new Error("Synthetic backend outage"); };
  try {
    const { default: sitemap } = await import("../app/sitemap");
    const entries = await sitemap();
    assert.ok(entries.some(entry => entry.url === "https://papershapers.in/syllabus/class-10/science"));
    assert.ok(entries.some(entry => entry.url === "https://study.papershapers.in/papershapers/study-guide"));
    assert.ok(entries.some(entry => entry.url === "https://marketplace.papershapers.in/noticeboard/guides"));
    assert.ok(!entries.some(entry => /dashboard|\/tests\/|\/papers\/|example-|\/journal\/new/.test(entry.url)));
    assert.equal(new Set(entries.map(entry => entry.url)).size, entries.length);
    const { GET } = await import("../app/sitemaps/[site]/route");
    for (const [site, host] of [["home", "papershapers.in"], ["study", "study.papershapers.in"], ["nearby", "marketplace.papershapers.in"]]) {
      const response = await GET(new Request("https://papershapers.in"), { params: Promise.resolve({ site: `${site}.xml` }) });
      const urls = [...(await response.text()).matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1]);
      assert.ok(urls.length > 0);
      assert.ok(urls.every(url => new URL(url).hostname === host));
    }
  } finally {
    globalThis.fetch = previousFetch;
    if (previousDatabase === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabase;
  }
});
