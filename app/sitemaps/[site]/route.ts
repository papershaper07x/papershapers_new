import sitemap from "../../sitemap";
import { siteForPath, type PublicSite } from "../../../lib/seo";

export const dynamic = "force-dynamic";
const sites = new Set(["home.xml", "study.xml", "nearby.xml"]);
const xmlEscape = (value: string) => value.replace(/[<>&"']/g, character => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[character]!);

export async function GET(_request: Request, { params }: { params: Promise<{ site: string }> }) {
  const { site } = await params;
  if (!sites.has(site)) return new Response("Not found", { status: 404 });
  const group = site.replace(".xml", "") as PublicSite;
  const entries = (await sitemap()).filter(entry => siteForPath(new URL(entry.url).pathname) === group);
  const body = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries.map(entry => `<url><loc>${xmlEscape(entry.url)}</loc></url>`).join("")}</urlset>`;
  return new Response(body, { headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=0, must-revalidate" } });
}
