import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { StudyBuilder } from "./study-builder";
import { StudySupport } from "./study-support";
import { getCurrentUser } from "../../lib/auth";

export const metadata: Metadata = {
  title: "Mock Paper Generator & Live Exam Arena for CBSE 9–12 | Paper Shapers",
  description: "Ace your CBSE board exams with precision mock papers, live classroom battle arenas, and instant rubric evaluations. No cap.",
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
          <p className="kicker" style={{ color: "#efbd55" }}><span>01</span> STUDY LAB · CBSE 9–12</p>
          <h1>Crush your exams.<br /><em>Next-level prep.</em></h1>
          <p className="hero-lede">
            Zero fluff. Pure exam confidence. Spawn syllabus-targeted practice papers in seconds, squad up in live battle arenas, and get instant feedback with exact marking breakdowns. Straight facts.
          </p>
          <div className="hero-actions">
            <a
              className="button button--dark"
              href={user ? "/papershapers/dashboard" : "/auth?next=%2Fpapershapers%2Fdashboard"}
              style={{ fontWeight: 800 }}
            >
              {user ? "Open My Study Desk" : "Claim Free Study Desk"} →
            </a>
            <a className="text-link" href="#builder">Try the Paper Brief ↓</a>
          </div>
        </div>

        <div className="study-sheet" aria-label="Sample mathematics question paper">
          <div className="sheet-meta">
            <span>⚡ PRACTICE ARENA</span>
            <span>45 MIN SPEEDRUN</span>
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
          <div className="sheet-scribble">Instant grading on submit →</div>
        </div>
      </section>

      <StudyBuilder authenticated={Boolean(user)} userName={user?.name} />

      <section className="study-explainer page-shell" id="how-it-works">
        <div className="section-heading">
          <p className="kicker">The ultimate revision loop</p>
          <h2>One paper. Major Ws.</h2>
          <p>
            Stop passive re-reading. Active recall with instant feedback turns tough chapters into easy Ws. Secure the bag for your finals.
          </p>
        </div>
        <ol className="study-explainer__steps">
          <li>
            <span>01</span>
            <h3>Lock in your exact syllabus.</h3>
            <p>Pick your class, stream, subject, and the exact chapters you are learning right now. No irrelevant questions, no guesswork.</p>
          </li>
          <li>
            <span>02</span>
            <h3>Choose your challenge level.</h3>
            <p>Tackle a 20-min rapid speedrun, an exam power check (40 marks), or a full 80-mark board marathon with official timing.</p>
          </li>
          <li>
            <span>03</span>
            <h3>Conquer the test arena.</h3>
            <p>Attempt in a distraction-free view with interactive MCQ tap-to-select, live timers, and background autosave.</p>
          </li>
          <li>
            <span>04</span>
            <h3>Level up with instant grading.</h3>
            <p>Vibe check your answers instantly. Get a breakdown of earned marks, expected CBSE marking steps, and targeted insights showing you exactly how to max out your score.</p>
          </li>
        </ol>
      </section>

      <section className="toolkit page-shell" id="toolkit">
        <div className="section-heading">
          <p className="kicker">Next-gen study tools</p>
          <h2>Power up your daily revision.</h2>
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

      <section className="curriculum-highlight page-shell" style={{ margin: '4rem auto', padding: '3rem', background: 'linear-gradient(145deg, #1e1b4b, #312e81)', color: 'white', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
        <div style={{ textAlign: 'center', maxWidth: '800px', margin: '0 auto' }}>
          <span style={{ background: '#c9ff47', color: '#111827', padding: '0.5rem 1rem', borderRadius: '9999px', fontSize: '0.85rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Source-aware practice planning</span>
          <h2 style={{ fontSize: '2.5rem', marginTop: '1.5rem', marginBottom: '1rem', fontWeight: 800, lineHeight: 1.1 }}>Start from a syllabus slice, not a blank chat.</h2>
          <p style={{ fontSize: '1.1rem', color: '#c7d2fe', lineHeight: 1.6, marginBottom: '2rem' }}>
            The test planner helps Class 9–12 learners choose a supported subject and chapter set before a paper is requested. It uses the installed curriculum catalogue as context, then checks the returned paper structure and marks before showing it. <strong>Every paper remains practice material, not an official CBSE exam or certified marking result.</strong>
          </p>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', minWidth: '150px' }}>
              <strong style={{ fontSize: '1.5rem', color: '#38bdf8', display: 'block' }}>Class 9–12</strong>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8' }}>Planner coverage</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', minWidth: '150px' }}>
              <strong style={{ fontSize: '1.5rem', color: '#38bdf8', display: 'block' }}>Chapter-led</strong>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8' }}>Paper briefs</span>
            </div>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '1rem', borderRadius: '8px', minWidth: '150px' }}>
              <strong style={{ fontSize: '1.5rem', color: '#38bdf8', display: 'block' }}>Formative</strong>
              <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#94a3b8' }}>Review, not ranking</span>
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

      <section className="study-disclaimer page-shell" style={{ margin: "3rem auto 2rem", padding: "1.25rem 1.5rem", background: "rgba(217, 184, 95, 0.12)", border: "1px solid #d9b85f", borderRadius: "6px", fontSize: "0.85rem", color: "#4a3c10", lineHeight: 1.6 }}>
        <strong>CBSE Practice Disclaimer:</strong> Paper Shapers is an independent learning platform. All mock question papers, timed live room sessions, and automated assessments are formative revision aids designed to reinforce chapter concepts and help educators review student learning. They do not constitute official CBSE examination papers, certified answer keys, or accredited grade transcripts.
      </section>

      <SiteFooter portal="study" />
    </main>
  );
}
