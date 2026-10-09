import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { StudyBuilder } from "./study-builder";
import { StudySupport } from "./study-support";
import { getCurrentUser } from "../../lib/auth";

export const metadata: Metadata = {
  title: "CBSE chapter practice papers and teacher Live Rooms",
  description: "Create chapter-based CBSE practice papers, attempt them online, and review formative feedback. Teachers can host Live Rooms for their class.",
  alternates: { canonical: "/papershapers" },
  openGraph: { title: "Paper Shapers Study Lab", description: "CBSE board prep: mock papers, live rooms, and instant score breakdowns." },
};

export default async function StudyLab() {
  const user = await getCurrentUser();
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "Paper Shapers AI Study Lab",
    applicationCategory: "EducationalApplication",
    operatingSystem: "Web",
    description: "An AI-powered CBSE study workspace for creating syllabus-targeted mock papers, live exam rooms, and instant AI rubric evaluation.",
    audience: { "@type": "EducationalAudience", educationalRole: "student" },
  };

  return (
    <main className="portal-page study-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <SiteHeader portal="study" user={user} />

      <section className="portal-hero page-shell">
        <div>
          <p className="kicker" style={{ color: "var(--yellow, #efbd55)" }}><span>01</span> STUDY LAB · CBSE 1–12</p>
          <h1>Practise your chapters.<br /><em>Understand your mistakes.</em></h1>
          <p className="hero-lede">
            Choose your class, subject, and chapters. Create a focused practice paper, attempt it online, and review question-level feedback. Teachers can bring a group into a Live Room.
          </p>
          <div className="hero-actions">
            <a
              className="button button--dark"
              href={user ? "/papershapers/dashboard" : "/auth?next=%2Fpapershapers%2Fdashboard"}
              style={{ fontWeight: 800 }}
            >
              {user ? "Open your study desk" : "Start practising"} →
            </a>
            <a className="text-link" href="#builder">Choose your chapters ↓</a>
          </div>
        </div>

        <div className="study-sheet" aria-label="Sample mathematics question paper">
          <div className="sheet-meta">
            <span>ILLUSTRATIVE PRACTICE QUESTIONS</span>
            <span>CLASS 10 · MATHEMATICS</span>
          </div>
          <h2>Quadratic Equations</h2>
          <p>Targeted Chapter Prep · Class 10</p>
          <div className="sheet-question">
            <b>01</b>
            <span>Find the roots of x² − 7x + 12 = 0 using factorization.</span>
            <i>3 marks</i>
          </div>
          <div className="sheet-question">
            <b>02</b>
            <span>If α and β are the roots of 2x² + 5x − 3, calculate the value of α + β.</span>
            <i>2 marks</i>
          </div>
          <div className="sheet-scribble">Formative feedback after submission →</div>
        </div>
      </section>

      <StudyBuilder authenticated={Boolean(user)} userName={user?.name} />

      <section className="study-explainer page-shell" id="how-it-works">
        <div className="section-heading">
          <p className="kicker">Your practice loop</p>
          <h2>Practise, review, repeat.</h2>
          <p>
            Use a focused paper to identify questions that need another explanation, then review the answer outlines with your teacher.
          </p>
        </div>
        <ol className="study-explainer__steps">
          <li>
            <span>01</span>
            <h3>Choose your assigned chapters.</h3>
            <p>Pick your class, stream, subject, and the exact chapters you are learning right now. Confirm the chapter selection against your school’s current syllabus.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Choose your paper length.</h3>
            <p>Choose a 40-mark paper with 90 minutes of practice time or an 80-mark paper with 180 minutes. These are practice formats, not official timings for every subject.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Attempt at your own desk.</h3>
            <p>Attempt in a distraction-free view with interactive MCQ tap-to-select, live timers, and background autosave.</p>
          </li>
          <li>
            <span>04</span>
            <h3>Review formative feedback.</h3>
            <p>Read the feedback beside each response and answer outline. AI feedback may be incorrect; use teacher judgement when reviewing it.</p>
          </li>
        </ol>
      </section>

      <section className="toolkit page-shell" id="toolkit">
        <div className="section-heading">
          <p className="kicker">Planned tools</p>
          <h2>More study tools are planned.</h2>
        </div>
        <div className="tool-grid">
          <article>
            <span>PDF → ACTIVE QUIZ</span>
            <h3>Smart Note Mixer</h3>
            <p>Turn textbook excerpts and handwritten notes into high-yield active-recall questions instead of mindless highlighting.</p>
            <button type="button">Coming next <b>↗</b></button>
          </article>
          <article>
            <span>TOPIC → BLUEPRINT</span>
            <h3>Concept Mapper</h3>
            <p>Break complex topics into high-frequency exam questions, critical formulas, and step-by-step concept outlines.</p>
            <button type="button">Coming next <b>↗</b></button>
          </article>
          <article>
            <span>BOARD → SPEEDRUN</span>
            <h3>Revision Velocity</h3>
            <p>Build an actionable study plan balancing high-weightage chapters with the topics you dread, paced to exam day.</p>
            <button type="button">Coming next <b>↗</b></button>
          </article>
        </div>
      </section>

      <section className="curriculum-highlight page-shell">
        <div className="curriculum-highlight__inner">
          <span className="curriculum-highlight__badge">Source-aware practice planning</span>
          <h2>Start from a syllabus slice, not a blank chat.</h2>
          <p>
            The test planner helps Class 1–12 learners choose a supported subject and chapter set before a paper is requested. It uses the installed curriculum catalogue as context, then checks the returned paper structure and marks before showing it. <strong>Every paper remains practice material, not an official CBSE exam or certified marking result.</strong>
          </p>
          <div className="curriculum-highlight__grid">
            <div className="curriculum-highlight__card">
              <strong>Class 1–12</strong>
              <span>Planner coverage</span>
            </div>
            <div className="curriculum-highlight__card">
              <strong>Chapter-led</strong>
              <span>Paper briefs</span>
            </div>
            <div className="curriculum-highlight__card">
              <strong>Formative</strong>
              <span>Review, not ranking</span>
            </div>
          </div>
        </div>
      </section>

      <section className="study-audiences page-shell" id="teachers">
        <div className="section-heading">
          <p className="kicker">A calmer practice loop</p>
          <h2>Useful for learners, clear for teachers.</h2>
          <p>Paper Shapers supports focused preparation and educator-led review without treating an AI estimate as a final result.</p>
        </div>
        <div className="study-audiences__grid">
          <article>
            <span>FOR STUDENTS</span>
            <h3>Practise one chapter set at a time.</h3>
            <p>Build focused practice papers, attempt them in a quieter test view, and keep the questions, answers, and formative review together.</p>
          </article>
          <article>
            <span>FOR TEACHERS</span>
            <h3>Small live practice rooms.</h3>
            <p>Create a room from a paper, watch submissions arrive, and use question-level formative feedback as an input to your own review.</p>
          </article>
          <article>
            <span>FOR COACHING CREWS</span>
            <h3>A simple common starting point.</h3>
            <p>Shape chapter-led practice sets for a group and review which questions need another explanation. Results are not official assessment data.</p>
          </article>
        </div>
      </section>

      <StudySupport authenticated={Boolean(user)} contactEmail={process.env.STUDY_CONTACT_EMAIL || "hello@papershapers.in"} />

      <section className="study-disclaimer page-shell">
        <strong>CBSE Practice Disclaimer:</strong> Paper Shapers is an independent learning platform. All mock question papers, timed live room sessions, and automated assessments are formative revision aids designed to reinforce chapter concepts and help educators review student learning. They do not constitute official CBSE examination papers, certified answer keys, or accredited grade transcripts.
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
