import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../../../components/SiteChrome";
import fs from "fs/promises";
import path from "path";

async function getCatalog() {
  const file = await fs.readFile(path.join(process.cwd(), "data", "curriculum_catalog.json"), "utf8");
  return JSON.parse(file);
}

export async function generateMetadata({ params }: { params: Promise<{ grade: string, subject: string }> }): Promise<Metadata> {
  const { grade, subject } = await params;
  const decodedSubject = decodeURIComponent(subject).replace(/-/g, " ");
  const capitalizedSubject = decodedSubject.replace(/\b\w/g, l => l.toUpperCase());

  return {
    title: `Class ${grade} ${capitalizedSubject} Syllabus & NCERT Chapters | Paper Shapers`,
    description: `Complete CBSE Class ${grade} ${capitalizedSubject} syllabus. Browse NCERT books, chapter names, PDF links, and important topics to prepare for your exams.`,
    keywords: `Class ${grade} ${capitalizedSubject}, CBSE Class ${grade} ${capitalizedSubject} syllabus, NCERT Class ${grade} ${capitalizedSubject}, ${capitalizedSubject} chapters, Paper Shapers`,
  };
}

export default async function SubjectSyllabusPage({ params }: { params: Promise<{ grade: string, subject: string }> }) {
  const { grade, subject } = await params;
  const decodedSubject = decodeURIComponent(subject).replace(/-/g, " ").toLowerCase();
  
  const catalog = await getCatalog();
  const classData = catalog.classes.find((c: any) => c.grade === grade);
  const subjectData = classData?.subjects.find((s: any) => s.subject.toLowerCase() === decodedSubject);

  if (!classData || !subjectData) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={null} />
        <div className="page-shell mt-10 text-center py-20">
          <h1>Subject Not Found</h1>
          <p>We could not locate syllabus data for this subject.</p>
          <Link href={`/syllabus/class-${grade}`} className="button button--dark mt-4 inline-block">← Back to Class {grade}</Link>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={null} />

      <div className="study-route__bar page-shell flex items-center py-3 border-b border-[#d4cbb8]">
        <Link href={`/syllabus/class-${grade}`} className="font-semibold hover:underline">← Back to Class {grade}</Link>
      </div>

      <section className="study-dash-hero page-shell mt-8">
        <div>
          <p className="dash-overline">CBSE NCERT CURRICULUM</p>
          <h1 className="text-4xl font-serif font-medium mt-2">Class {grade} {subjectData.subject} Syllabus</h1>
          <p className="mt-2 text-lg text-gray-700 max-w-2xl">
            Below is the complete official NCERT chapter list and textbook details for Class {grade} {subjectData.subject}. 
            Use this syllabus to track your progress or generate AI mock tests based on these exact chapters.
          </p>
          <Link href="/papershapers/tests/new" className="button button--accent bg-[#c9ff47] text-gray-900 mt-6 inline-block">
            Generate Mock Test for {subjectData.subject} →
          </Link>
        </div>
      </section>

      <section className="page-shell mt-10 mb-20">
        <div className="flex flex-col gap-10">
          {Object.entries(subjectData.books || {}).map(([bookName, chapters]: [string, any]) => (
            <div key={bookName} className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
              <h2 className="text-2xl font-bold text-[#101d38] mb-4 border-b border-gray-100 pb-4">
                Textbook: {bookName}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {chapters.map((chapter: any) => (
                  <div key={chapter.chapter_no} className="p-4 bg-gray-50 border border-gray-100 rounded flex flex-col">
                    <strong className="text-sm text-gray-500 uppercase tracking-wide mb-1">
                      Chapter {chapter.chapter_no}
                    </strong>
                    <span className="text-gray-900 font-medium">
                      {chapter.title}
                    </span>
                    {chapter.pdf_url && (
                      <a 
                        href={chapter.pdf_url} 
                        target="_blank" 
                        rel="nofollow noopener"
                        className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                      >
                        Download PDF ↓
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
          
          {/* Fallback if books structure is missing but chapters array exists */}
          {(!subjectData.books || Object.keys(subjectData.books).length === 0) && subjectData.chapters && (
             <div className="bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
             <h2 className="text-2xl font-bold text-[#101d38] mb-4 border-b border-gray-100 pb-4">
               All Chapters
             </h2>
             <ul className="list-disc pl-5 space-y-2">
               {subjectData.chapters.map((chap: string, idx: number) => (
                 <li key={idx} className="text-gray-800">{chap}</li>
               ))}
             </ul>
           </div>
          )}
        </div>
      </section>

      {/* SEO text block at the bottom to increase semantic density */}
      <section className="bg-[#101d38] text-white py-12 mt-12">
        <div className="page-shell">
          <h3 className="text-xl font-serif mb-4">Why practice Class {grade} {subjectData.subject} with Paper Shapers?</h3>
          <p className="text-slate-300 text-sm leading-relaxed max-w-4xl">
            Mastering the CBSE Class {grade} {subjectData.subject} syllabus requires consistent practice and targeted feedback. 
            Our AI-powered Mock Paper Generator allows you to select specific NCERT chapters from {Object.keys(subjectData.books || {}).join(", ")} 
            and instantly create highly accurate, curriculum-aligned test papers. Whether you need a quick 20-minute revision on a single topic 
            or a full 3-hour mock exam covering the entire syllabus, Paper Shapers provides the ultimate formative assessment tool.
          </p>
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
