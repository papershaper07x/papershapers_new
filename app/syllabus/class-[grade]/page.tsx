import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import fs from "fs/promises";
import path from "path";

async function getCatalog() {
  const file = await fs.readFile(path.join(process.cwd(), "data", "curriculum_catalog.json"), "utf8");
  return JSON.parse(file);
}

export async function generateMetadata({ params }: { params: Promise<{ grade: string }> }): Promise<Metadata> {
  const { grade } = await params;
  return {
    title: `CBSE Class ${grade} Syllabus, NCERT Books & Chapters | Paper Shapers`,
    description: `Complete CBSE Class ${grade} syllabus and NCERT textbook list. View all subjects, chapters, and topics for Class ${grade} preparation.`,
    keywords: `CBSE Class ${grade}, NCERT Class ${grade}, Class ${grade} syllabus, Class ${grade} subjects, CBSE books, NCERT chapters`,
  };
}

export default async function ClassSyllabusPage({ params }: { params: Promise<{ grade: string }> }) {
  const { grade } = await params;
  const catalog = await getCatalog();
  const classData = catalog.classes.find((c: any) => c.grade === grade);

  if (!classData) {
    return (
      <main className="portal-page study-page">
        <SiteHeader portal="study" user={null} />
        <div className="page-shell mt-10 text-center py-20">
          <h1>Class Not Found</h1>
          <p>We could not locate syllabus data for Class {grade}.</p>
          <Link href="/syllabus" className="button button--dark mt-4 inline-block">← Back to Syllabus</Link>
        </div>
        <SiteFooter portal="study" />
      </main>
    );
  }

  return (
    <main className="portal-page study-page">
      <SiteHeader portal="study" user={null} />

      <div className="study-route__bar page-shell flex items-center py-3 border-b border-[#d4cbb8]">
        <Link href="/syllabus" className="font-semibold hover:underline">← All Classes</Link>
      </div>

      <section className="study-dash-hero page-shell mt-8">
        <div>
          <p className="dash-overline">CBSE BOARD &amp; NCERT CURRICULUM</p>
          <h1 className="text-4xl font-serif font-medium mt-2">Class {grade} Syllabus</h1>
          <p className="mt-2 text-lg text-gray-700 max-w-2xl">
            Explore the full list of official CBSE subjects and NCERT textbooks for Class {grade}. 
            Click on any subject to view chapter-by-chapter topics and create targeted AI mock tests.
          </p>
        </div>
      </section>

      <section className="page-shell mt-10 mb-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {classData.subjects.map((sub: any) => (
            <Link
              key={sub.subject}
              href={`/syllabus/class-${grade}/${encodeURIComponent(sub.subject.toLowerCase().replace(/\s+/g, '-'))}`}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:border-[#efbd55] hover:shadow-[4px_4px_0_#efbd55] transition-all"
            >
              <h2 className="text-xl font-bold text-[#101d38] m-0">{sub.subject}</h2>
              <p className="text-sm text-gray-500 mt-2 mb-0">
                {sub.chapters?.length || 0} Chapters · {Object.keys(sub.books || {}).length} Books
              </p>
            </Link>
          ))}
        </div>
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
