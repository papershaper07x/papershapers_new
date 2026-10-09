import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import { getSyllabusCatalog, gradeFromSlug, subjectSlug } from "../catalog";

type Props = { params: Promise<{ classSlug: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { classSlug } = await params;
  const grade = gradeFromSlug(classSlug);
  if (!grade) notFound();
  return { title: `Class ${grade} chapter practice catalogue`, description: `Browse the available Class ${grade} subjects and NCERT chapter entries, then plan a focused practice paper.`, alternates: { canonical: `/syllabus/${classSlug}` } };
}
export default async function ClassSyllabusPage({ params }: Props) {
  const { classSlug } = await params;
  const grade = gradeFromSlug(classSlug);
  if (!grade) notFound();
  const catalog = await getSyllabusCatalog();
  const entry = catalog.classes.find((item) => item.grade === grade);
  if (!entry) notFound();
  return <main className="portal-page study-page"><SiteHeader portal="study" user={null} /><section className="study-route page-shell syllabus-content"><Link href="/syllabus">Back to all classes</Link><p className="kicker">Installed curriculum catalogue</p><h1>Class {grade} subjects</h1><p>These entries describe the installed source. Confirm current chapter coverage with your school; NCERT textbook contents and the current CBSE examination syllabus can differ.</p><div className="syllabus-grid">{entry.subjects.map((subject) => <Link className="syllabus-entry" key={subject.subject} href={`/syllabus/${classSlug}/${encodeURIComponent(subjectSlug(subject.subject))}`}><h2>{subject.subject}</h2><p>{subject.chapters.length} chapter entries</p><span>Browse chapters →</span></Link>)}</div></section><SiteFooter portal="study" /></main>;
}
