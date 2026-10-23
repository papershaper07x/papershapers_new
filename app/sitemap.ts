import type { MetadataRoute } from "next";
import { canonicalUrl, publicPaths } from "../lib/seo";
import discovery from "./syllabus/discovery-paths.json";
import { getSyllabusCatalog, subjectSlug } from "./syllabus/catalog";
import { localGuides } from "./noticeboard/guides-content";
import { marketplaceUrl } from "../lib/marketplace-seo";
import {getDb} from '../db';

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production')return [];
  const paths = publicPaths.filter(path => !path.startsWith("/noticeboard"));
  try {
    const catalog = await getSyllabusCatalog(5000);
    if (!catalog.classes.length) throw new Error("Curriculum catalogue is empty");
    for (const entry of catalog.classes) {
      paths.push(`/syllabus/class-${entry.grade}`);
      for (const subject of entry.subjects) paths.push(`/syllabus/class-${entry.grade}/${encodeURIComponent(subjectSlug(subject.subject))}`);
    }
  } catch {
    paths.push(...discovery.paths);
    console.warn(JSON.stringify({ schema: 1, service: "web", event: "sitemap.curriculum_fallback", operation: "sitemap", pathCount: discovery.paths.length }));
  }
  const marketplacePaths = ["/noticeboard", "/noticeboard/safety", "/noticeboard/guides", ...localGuides.filter(guide => !guide.dummy).map(guide => `/noticeboard/guides/${guide.slug}`)];
  const published:MetadataRoute.Sitemap=[];
  try {
    const notices=await getDb().prepare("SELECT n.id FROM marketplace_notices n WHERE status='approved' AND expires_at>CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id) ORDER BY created_at DESC,id LIMIT 500").all<{id:string}>();
    published.push(...notices.results.map(row=>({url:marketplaceUrl(`/noticeboard/notices/${encodeURIComponent(row.id)}`)})));
  }catch{/* Keep the static sitemap available during database maintenance. */}
  try {
    const posts=await getDb().prepare("SELECT slug FROM community_posts WHERE status='published' ORDER BY published_at DESC,id LIMIT 500").all<{slug:string}>();
    published.push(...posts.results.map(row=>({url:canonicalUrl(`/papershapers/journal/${encodeURIComponent(row.slug)}`)})));
  }catch{/* Public content recovery does not publish pending submissions. */}
  const entries = [...paths.map(path => ({ url: canonicalUrl(path) })), ...marketplacePaths.map(path => ({ url: marketplaceUrl(path) })), ...published];
  return [...new Map(entries.map(entry => [entry.url, entry])).values()];
}
