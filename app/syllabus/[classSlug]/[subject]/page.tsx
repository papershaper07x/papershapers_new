import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import { getSyllabusCatalog, gradeFromSlug, subjectSlug } from "../../catalog";

type Props = { params: Promise<{ classSlug: string; subject: string }> };
async function getSelection(params: Props["params"]) {
  const { classSlug, subject } = await params;
  const grade = gradeFromSlug(classSlug);
  if (!grade) notFound();
  const catalog = await getSyllabusCatalog();
  const entry = catalog.classes.find((item) => item.grade === grade);
  const selection = entry?.subjects.find((item) => subjectSlug(item.subject) === subject);
  if (!selection) notFound();
  return { classSlug, grade, selection };
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { classSlug, grade, selection } = await getSelection(params);
  return { title: `Class ${grade} ${selection.subject} chapters and practice`, description: `Browse available ${selection.subject} chapter entries for Class ${grade} and plan a chapter-based practice paper.`, alternates: { canonical: `/syllabus/${classSlug}/${encodeURIComponent(subjectSlug(selection.subject))}` } };
}
export default async function SubjectSyllabusPage({ params }: Props) {
  const { classSlug, grade, selection } = await getSelection(params);
  return <main className="portal-page study-page"><SiteHeader portal="study" user={null} /><section className="study-route page-shell syllabus-content"><Link href={`/syllabus/${classSlug}`}>Back to Class {grade}</Link><p className="kicker">Chapter-led practice</p><h1>Class {grade} {selection.subject}</h1><p>Chapter entries come from the installed curriculum source. Choose chapters currently assigned by your school. This catalogue is not an official current-year CBSE syllabus.</p><Link className="button button--accent" href={`/papershapers/tests/new?grade=${grade}&subject=${encodeURIComponent(selection.subject)}`}>Plan a {selection.subject} practice paper →</Link><ol className="syllabus-chapters">{selection.chapters.map((chapter) => <li key={chapter}>{chapter}</li>)}</ol><p>Generated questions and AI feedback are revision aids and need review; they are not certified examination material.</p></section><SiteFooter portal="study" /></main>;
}
