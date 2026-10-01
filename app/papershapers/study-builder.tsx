"use client";

export function StudyBuilder({ authenticated, userName }: { authenticated: boolean; userName?: string }) {
  const destination = authenticated ? "/papershapers/tests/new" : "/auth?next=%2Fpapershapers%2Ftests%2Fnew";
  return (
    <section className="builder-wrap" id="builder">
      <div className="page-shell builder-grid">
        <div className="builder-intro">
          <p className="kicker" style={{ color: "#c9ff47" }}>⚡ AI Mock Paper Generator</p>
          <h2>Custom papers in seconds.<br /><em>Tailored to your syllabus.</em></h2>
          <p>
            {authenticated
              ? `Hey ${userName?.split(" ")[0]}! Select your CBSE class and chapters to generate a high-yield practice paper instantly.`
              : "Sign in to lock in your class, subject, and chapter blueprint. Turn your syllabus into instant practice tests."}
          </p>
        </div>
        <div className="builder-panel builder-panel--launch">
          <p className="planner-overline">CLASSES 9–12 · CBSE BOARD ALIGNED</p>
          <h3>Craft your ultimate revision paper.</h3>
          <p>
            Choose from quick 20-min speedruns to 80-mark board simulations. Every paper features authentic MCQs, short answers, and structured long questions.
          </p>
          <a
            className="button button--accent builder-button"
            href={destination}
            style={{
              backgroundColor: "#c9ff47",
              color: "#111827",
              fontWeight: 900,
              border: "2px solid #111827",
              boxShadow: "4px 4px 0 #111827",
              display: "inline-flex",
            }}
          >
            {authenticated ? "Launch AI Test Planner" : "Sign in to Build Paper"} <span>→</span>
          </a>
          <p className="builder-hint">
            Smart generation tuned to authentic NCERT curriculum concepts. Includes instant question-level answer keys and AI rubric evaluation.
          </p>
        </div>
      </div>
    </section>
  );
}
