import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { StudyBuilder } from "./study-builder";
import { StudySupport } from "./study-support";
import { getCurrentUser } from "../../lib/auth";

export const metadata: Metadata = {
  title: "AI mock paper generator for CBSE Classes 9–12 | Paper Shapers",
  description: "Create source-aware CBSE mock papers for Classes 9–12, practise with a timer, review question-level feedback, and save printable PDFs.",
  alternates: { canonical: "/papershapers" },
  openGraph: { title: "Paper Shapers Study Lab", description: "Focused CBSE mock papers, timed practice, and question-level review for Classes 9–12." },
};

export default async function StudyLab() {
  const user = await getCurrentUser();
  const structuredData = { "@context": "https://schema.org", "@type": "WebApplication", name: "Paper Shapers Study Lab", applicationCategory: "EducationalApplication", operatingSystem: "Web", description: "A CBSE study workspace for creating mock papers, timed practice, and question-level review for Classes 9–12.", audience: { "@type": "EducationalAudience", educationalRole: "student" } };
  return (
    <main className="portal-page study-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader portal="study" user={user} />
      <section className="portal-hero page-shell">
        <div>
          <p className="kicker"><span>01</span> The study lab</p>
          <h1>Practice that<br /><em>fits the learner.</em></h1>
          <p className="hero-lede">Build a focused mock paper, keep every attempt, and return to the chapters that need work. Your private study workspace travels with you.</p>
          <div className="hero-actions"><a className="button button--dark" href={user ? "/papershapers/dashboard" : "/auth?next=%2Fpapershapers%2Fdashboard"}>{user ? "Open my study desk" : "Create a free study desk"} →</a><a className="text-link" href="#builder">Try the paper brief ↓</a></div>
        </div>
        <div className="study-sheet" aria-label="Sample mathematics question paper">
          <div className="sheet-meta"><span>MATHEMATICS</span><span>45 MIN</span></div>
          <h2>Quadratic equations</h2>
          <p>Focused practice · Class 10</p>
          <div className="sheet-question"><b>01</b><span>Find the roots of x² − 7x + 12 = 0.</span><i>3 marks</i></div>
          <div className="sheet-question"><b>02</b><span>If α and β are the roots of 2x² + 5x − 3, find α + β.</span><i>2 marks</i></div>
          <div className="sheet-scribble">show your thinking →</div>
        </div>
      </section>
      <StudyBuilder authenticated={Boolean(user)} userName={user?.name} />
      <section className="study-explainer page-shell" id="how-it-works">
        <div className="section-heading"><p className="kicker">A clearer study loop</p><h2>One paper. Four useful moves.</h2><p>A steady workflow makes revision feel lighter: make the brief, sit the paper, see the evidence, then choose the next chapter.</p></div>
        <ol className="study-explainer__steps"><li><span>01</span><h3>Choose what is actually covered.</h3><p>Start with your class, subject, and the chapters your school has reached—not a vague all-subject prompt.</p></li><li><span>02</span><h3>Set a pace that feels possible.</h3><p>Pick a quick check, exam practice, or weak-spot revision. A shorter half paper is a valid place to begin.</p></li><li><span>03</span><h3>Attempt in one calm view.</h3><p>Use the timer, write your own response, and keep the generated paper fixed while you work.</p></li><li><span>04</span><h3>Turn feedback into a next step.</h3><p>Review the question, your answer, and the answer outline together before you make the next brief.</p></li></ol>
      </section>
      <section className="toolkit page-shell" id="toolkit">
        <div className="section-heading"><p className="kicker">More ways to learn</p><h2>A small, serious toolkit.</h2></div>
        <div className="tool-grid">
          <article><span>PDF → QUIZ</span><h3>Note Mixer</h3><p>Turn your own notes or textbook pages into active-recall questions instead of another passive re-read.</p><button type="button">Coming next <b>↗</b></button></article>
          <article><span>TOPIC → BRIEF</span><h3>Research Mapper</h3><p>Break a broad topic into key questions, useful angles, and a source-aware research outline.</p><button type="button">Coming next <b>↗</b></button></article>
          <article><span>WEEK → PLAN</span><h3>Revision Rhythm</h3><p>Build a realistic plan around the chapters you know, the ones you avoid, and the time you actually have.</p><button type="button">Coming next <b>↗</b></button></article>
        </div>
      </section>
      <section className="study-audiences page-shell" id="teachers">
        <div className="section-heading"><p className="kicker">Made for the real room</p><h2>Useful solo. Better with support.</h2><p>Paper Shapers is designed around the people who make revision happen: learners, teachers, and coaching teams.</p></div>
        <div className="study-audiences__grid"><article><span>FOR LEARNERS</span><h3>Less “where do I begin?”</h3><p>Build a small, specific paper, keep it in your study desk, and use the review to decide what deserves another round.</p></article><article><span>FOR TEACHERS</span><h3>A brief you can inspect.</h3><p>Use class, subject, and chapter choices to frame practice. Generated material is revision support, not a replacement for teacher judgement.</p></article><article><span>FOR COACHING TEAMS</span><h3>Repeat the useful parts.</h3><p>Start with a consistent source-aware brief and private learner attempts. Shared workflows and educator review are being prepared as pilot features.</p></article></div>
      </section>
      <StudySupport authenticated={Boolean(user)} contactEmail={process.env.STUDY_CONTACT_EMAIL || "hello@papershapers.in"} />
      <SiteFooter portal="study" />
    </main>
  );
}
