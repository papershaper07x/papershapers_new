import { pageMetadata, siteHref } from "../../lib/seo";
import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";
import { getSyllabusCatalog } from "./catalog";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata('/syllabus', 'Curriculum chapters and CBSE practice planning', 'Explore available classes, subjects, and NCERT chapter entries before planning a focused practice paper.');
export default async function SyllabusPage() {
  const catalog = await getSyllabusCatalog();
  return <main className="portal-page study-page"><SiteHeader portal="study" user={null} /><section className="study-route page-shell syllabus-content"><p className="kicker">Practice planning</p><h1>Find your class and chapters</h1><p>Browse the classes available in our installed curriculum source. Confirm the current examination syllabus with your school before choosing chapters.</p><div className="syllabus-grid">{catalog.classes.map((entry) => <Link className="syllabus-entry" key={entry.grade} href={siteHref(`/syllabus/class-${entry.grade}`)}><h2>Class {entry.grade}</h2><p>{entry.subjects.length} available subjects</p><span>Browse subjects →</span></Link>)}</div><p>Paper Shapers is independent and is not endorsed by CBSE or NCERT.</p></section><SiteFooter portal="study" /></main>;
}
