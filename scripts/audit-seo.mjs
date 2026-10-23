// Bounded, read-only public discovery check. No sign-in, AI generation or mutations.
import { writeFile } from "node:fs/promises";

const base = new URL(process.argv[2] || "http://localhost:3000");
const local = ["localhost", "127.0.0.1"].includes(base.hostname);
const response = await fetch(new URL("/sitemap.xml", base), { signal: AbortSignal.timeout(45000) });
if (!response.ok) throw new Error(`Sitemap returned ${response.status}`);
const xml = await response.text();
const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map(match => match[1].replace(/&amp;/g, "&"));
if (!urls.length || urls.length > 1500) throw new Error("Unexpected sitemap size; inspect before crawling");
const hosts = new Set([base.hostname, "papershapers.in", "study.papershapers.in", "marketplace.papershapers.in"]);
const results = [];
let index = 0;
async function worker() {
  while (index < urls.length) {
    const canonical = urls[index++];
    const target = new URL(canonical);
    if (!hosts.has(target.hostname) || !["http:", "https:"].includes(target.protocol)) throw new Error("Unexpected sitemap host");
    const requested = local ? new URL(target.pathname, base).href : target.href;
    const started = performance.now();
    try {
      const page = await fetch(requested, { signal: AbortSignal.timeout(45000) });
      const html = await page.text();
      const declared = html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/i)?.[1];
      const noindex = /<meta\b[^>]*name="robots"[^>]*content="[^"]*noindex/i.test(html) || /noindex/i.test(page.headers.get("x-robots-tag") || "");
      const valid = page.ok && !!declared && new URL(declared).href === target.href && !noindex;
      results.push({ canonical, status: page.status, declaredCanonical: declared || null, noindex, valid, elapsedMs: Math.round(performance.now() - started) });
    } catch {
      results.push({ canonical, valid: false, error: "Request failed or timed out" });
    }
  }
}
await Promise.all(Array.from({ length: 3 }, worker));
const failed = results.filter(result => !result.valid);
const report = { origin: base.origin, checkedAt: new Date().toISOString(), count: results.length, failures: failed.length, results };
if (process.argv[3]) await writeFile(process.argv[3], `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({ count: results.length, failures: failed.length, failed }, null, 2));
process.exitCode = failed.length ? 1 : 0;
