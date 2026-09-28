import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { StudyBuilder } from "./study-builder";

export const metadata: Metadata = {
  title: "Study Lab — Paper Shapers",
  description: "Build focused CBSE practice papers and turn study material into active revision.",
};

export default function StudyLab() {
  return (
    <main className="portal-page study-page">
      <SiteHeader portal="Study Lab" />
      <section className="portal-hero page-shell">
        <div>
          <p className="kicker"><span>01</span> The study lab</p>
          <h1>Practice that<br /><em>fits the learner.</em></h1>
          <p className="hero-lede">Build a focused mock paper in a few thoughtful choices. No noisy dashboard, no one-size-fits-all worksheet.</p>
          <div className="hero-actions"><a className="button button--dark" href="#builder">Build a practice set ↓</a><a className="text-link" href="#toolkit">See the toolkit ↗</a></div>
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
      <StudyBuilder />
      <section className="toolkit page-shell" id="toolkit">
        <div className="section-heading"><p className="kicker">More ways to learn</p><h2>A small, serious toolkit.</h2></div>
        <div className="tool-grid">
          <article><span>PDF → QUIZ</span><h3>Note Mixer</h3><p>Turn your own notes or textbook pages into active-recall questions instead of another passive re-read.</p><button type="button">Coming next <b>↗</b></button></article>
          <article><span>TOPIC → BRIEF</span><h3>Research Mapper</h3><p>Break a broad topic into key questions, useful angles, and a source-aware research outline.</p><button type="button">Coming next <b>↗</b></button></article>
          <article><span>WEEK → PLAN</span><h3>Revision Rhythm</h3><p>Build a realistic plan around the chapters you know, the ones you avoid, and the time you actually have.</p><button type="button">Coming next <b>↗</b></button></article>
        </div>
      </section>
      <SiteFooter />
    </main>
  );
}
