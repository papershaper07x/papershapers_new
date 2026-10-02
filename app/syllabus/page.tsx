import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../components/SiteChrome";

export const metadata: Metadata = {
  title: "CBSE Syllabus & NCERT Textbook Chapters (Class 1-12) | Paper Shapers",
  description: "Browse the complete CBSE and NCERT curriculum for all classes. Find official book titles, chapter names, and topics for Class 1 to Class 12 subjects.",
  keywords: "CBSE syllabus, NCERT chapters, CBSE Class 1-12, NCERT books, Paper Shapers curriculum",
};

export default function SyllabusPage() {
  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={null} />

      <section className="study-dash-hero page-shell mt-8">
        <div>
          <p className="dash-overline">OFFICIAL CURRICULUM CATALOG</p>
          <h1 className="text-4xl font-serif font-medium mt-2">CBSE &amp; NCERT Syllabus Index</h1>
          <p className="mt-2 text-lg text-gray-700 max-w-2xl">
            Select your class below to browse the complete list of subjects, official NCERT textbooks, and detailed chapter topics. 
            Paper Shapers maps our AI mock tests directly to this official curriculum for Classes 1 through 12.
          </p>
        </div>
      </section>

      <section className="page-shell mt-10 mb-20">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1].map((grade) => (
            <Link
              key={grade}
              href={`/syllabus/class-${grade}`}
              className="bg-white border-2 border-gray-200 hover:border-[#101d38] rounded-lg p-6 shadow-sm hover:shadow-[4px_4px_0_#101d38] transition-all flex flex-col items-center justify-center text-center"
            >
              <span className="text-xl font-bold text-[#101d38]">Class {grade}</span>
              <span className="text-sm text-gray-500 mt-1">View Subjects &amp; Chapters →</span>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
