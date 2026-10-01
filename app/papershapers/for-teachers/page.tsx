import type { Metadata } from "next";
import Link from "next/link";
import { StudyInformationLayout } from "../information-layout";

export const metadata: Metadata = { title: "Paper Shapers for teachers and coaching teams", description: "A free CBSE mock-paper workflow that supports teacher-led revision without replacing teacher judgement." };

export default async function TeachersPage() {
  return <StudyInformationLayout eyebrow="For teachers & coaching teams" title={<>Less time rebuilding<br />the same practice set. <em>More room to teach.</em></>} lede="Paper Shapers supports teacher-led revision with clear chapter choices, individual practice, downloadable papers, and a simple way to see what learners need next.">
    <section className="study-information__section page-shell" style={{ paddingBottom: 0 }}>
      <div style={{ marginBottom: "2.5rem" }}>
        <article
          style={{
            border: "2px solid #d9b85f",
            padding: "2.5rem 2rem",
            borderRadius: "10px",
            background: "#101d38",
            boxShadow: "6px 6px 0 #d9b85f",
            color: "#f8f5ed",
          }}
        >
          <span style={{ color: "#efbd55", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 700, letterSpacing: "0.12em" }}>
            ⚡ LIVE EXAM ARENA · INSTANT AI GRADING
          </span>
          <h2 style={{ color: "#ffffff", fontSize: "2.1rem", margin: "0.75rem 0 0.5rem", fontFamily: "Georgia, serif" }}>
            Host a live test arena.
          </h2>
          <p style={{ color: "rgba(248, 245, 237, 0.95)", fontSize: "1.05rem", lineHeight: "1.6", maxWidth: "720px", margin: "0 0 1.5rem" }}>
            Spin up an interactive testing room for any CBSE class or subject. Share the room code with your students, track real-time answers, and trigger instant AI rubric evaluations with zero grading burnout.
          </p>
          <Link
            className="button button--accent"
            href="/papershapers/for-teachers/rooms"
            style={{
              display: "inline-flex",
              backgroundColor: "#c9ff47",
              color: "#111827",
              fontWeight: 900,
              border: "2px solid #111827",
              boxShadow: "4px 4px 0 #111827",
            }}
          >
            Open Teacher Dashboard →
          </Link>
        </article>
      </div>
    </section>
    <section className="study-information__section page-shell"><div className="teacher-grid"><article><span>FOR A TEACHER</span><h2>Shape practice around the class you actually have.</h2><p>Use the mapped class, subject, and chapter options to start a paper from the work your learners have covered. It is a starting point for your judgement, not a replacement for it.</p></article><article><span>FOR A COACHING TEAM</span><h2>Give every learner a private attempt space.</h2><p>Learners can create their own study desks, practise independently, save PDFs, and return to the feedback. Shared briefs and educator review are planned pilot features, not promises already switched on.</p></article><article><span>FOR A SCHOOL</span><h2>Keep the conversation practical.</h2><p>Tell us the class range, subjects, and kind of revision problem you are trying to solve. We will use that to shape a small, honest pilot conversation.</p></article></div></section><section className="study-information__section study-information__section--gold"><div className="page-shell info-split"><div><p className="kicker">Start a conversation</p><h2>Tell us what your students are finding difficult.</h2></div><div><p>Whether it is revision consistency, mock-paper preparation, or an easier way to organise practice, we want to hear the real problem before proposing a solution.</p><Link className="button button--dark" href="/papershapers/contact">Contact Paper Shapers →</Link></div></div></section></StudyInformationLayout>;
}
