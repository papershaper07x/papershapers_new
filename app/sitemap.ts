import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../lib/site";
import { getSyllabusCatalog, subjectSlug } from "./syllabus/catalog";
import { localGuides } from "./noticeboard/guides-content";
import { marketplaceUrl } from "../lib/marketplace-seo";
import {getDb} from '../db';

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production')return [];
  const paths = ["/", "/papershapers", "/papershapers/how-it-works", "/papershapers/study-guide", "/papershapers/for-teachers", "/papershapers/contact", "/papershapers/journal", "/syllabus", "/privacy", "/terms", "/cookies"];
  try {
    const catalog = await getSyllabusCatalog(5000);
    for (const entry of catalog.classes) {
      paths.push(`/syllabus/class-${entry.grade}`);
      for (const subject of entry.subjects) paths.push(`/syllabus/class-${entry.grade}/${encodeURIComponent(subjectSlug(subject.subject))}`);
    }
  } catch { /* Keep public discovery available while the curriculum service wakes. */ }
  const marketplacePaths = ["/noticeboard", "/noticeboard/safety", "/noticeboard/guides", ...localGuides.filter(guide => !guide.dummy).map(guide => `/noticeboard/guides/${guide.slug}`)];
  const studyOrigin = process.env.NEXT_PUBLIC_STUDY_ORIGIN ? new URL(process.env.NEXT_PUBLIC_STUDY_ORIGIN).origin : SITE_ORIGIN;
  const published:MetadataRoute.Sitemap=[];
  try {
    const notices=await getDb().prepare("SELECT n.id FROM marketplace_notices n WHERE status='approved' AND expires_at>CURRENT_TIMESTAMP AND NOT EXISTS(SELECT 1 FROM marketplace_poster_blocks b WHERE b.user_id=n.author_id) ORDER BY created_at DESC,id LIMIT 500").all<{id:string}>();
    published.push(...notices.results.map(row=>({url:marketplaceUrl(`/noticeboard/notices/${encodeURIComponent(row.id)}`)})));
  }catch{/* Keep the static sitemap available during database maintenance. */}
  try {
    const posts=await getDb().prepare("SELECT slug FROM community_posts WHERE status='published' ORDER BY published_at DESC,id LIMIT 500").all<{slug:string}>();
    published.push(...posts.results.map(row=>({url:`${studyOrigin}/papershapers/journal/${encodeURIComponent(row.slug)}`})));
  }catch{/* Public content recovery does not publish pending submissions. */}
  return [...paths.map((path) => ({ url: `${path.startsWith("/papershapers") ? studyOrigin : SITE_ORIGIN}${path}` })), ...marketplacePaths.map(path => ({ url: marketplaceUrl(path) })),...published];
}
