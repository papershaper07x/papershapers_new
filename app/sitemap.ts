import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../lib/site";
import { getSyllabusCatalog, subjectSlug } from "./syllabus/catalog";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const paths = ["/", "/papershapers", "/papershapers/how-it-works", "/papershapers/study-guide", "/papershapers/for-teachers", "/papershapers/contact", "/papershapers/journal", "/syllabus", "/privacy", "/terms", "/cookies"];
  try {
    const catalog = await getSyllabusCatalog();
    for (const entry of catalog.classes) {
      paths.push(`/syllabus/class-${entry.grade}`);
      for (const subject of entry.subjects) paths.push(`/syllabus/class-${entry.grade}/${encodeURIComponent(subjectSlug(subject.subject))}`);
    }
  } catch { /* Keep public discovery available while the curriculum service wakes. */ }
  return paths.map((path) => ({ url: `${SITE_ORIGIN}${path}` }));
}
