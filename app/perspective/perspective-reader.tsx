"use client";

import { useEffect, useState } from "react";

const fallbackLenses = {
  left: { label: "The left lens", title: "Public investment is the missing piece", text: "This framing asks whether stronger public transport and shared infrastructure can reduce inequality while supporting climate goals.", questions: ["Who benefits first?", "Is access being treated as a public good?"] },
  centre: { label: "The centre brief", title: "The plan depends on delivery", text: "This framing focuses on implementation: funding, timelines, capacity, and measurable outcomes.", questions: ["What is funded today?", "Which outcome can be measured?"] },
  right: { label: "The right lens", title: "Costs and choice need more scrutiny", text: "This framing questions whether regulation and public spending could restrict choice or burden taxpayers.", questions: ["What will this cost taxpayers?", "Could competition solve it better?"] },
};

type LensKey = keyof typeof fallbackLenses;
type Article = { id: string; title: string; summary: string; source: string; category: string };
type Analysis = { provider: string; fact_base?: string[]; lenses: Record<LensKey, { headline: string; analysis: string; questions: string[] }> };

export function PerspectiveReader({ authenticated }: { authenticated: boolean }) {
  const [lens, setLens] = useState<LensKey>("centre");
  const [lensData, setLensData] = useState(fallbackLenses);
  const [article, setArticle] = useState<Article | null>(null);
  const [backendStatus, setBackendStatus] = useState("Checking the local news desk…");
  const [analyzing, setAnalyzing] = useState(false);
  const current = lensData[lens];

  useEffect(() => {
    fetch("/api/news/articles?limit=1").then(async (response) => {
      if (!response.ok) throw new Error();
      const result = await response.json() as { items: Article[] };
      if (result.items[0]) setArticle(result.items[0]);
      setBackendStatus(result.items[0] ? "Editorial desk connected" : "Awaiting today's briefing");
    }).catch(() => setBackendStatus("Displaying representative editorial formats"));
  }, []);

  async function analyze() {
    if (!article) return;
    setAnalyzing(true);
    const response = await fetch("/api/news/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ articleId: article.id }) });
    const result = await response.json() as { analysis?: Analysis; error?: string };
    if (result.analysis) {
      setLensData({
        left: { label: "The left lens", title: result.analysis.lenses.left.headline, text: result.analysis.lenses.left.analysis, questions: result.analysis.lenses.left.questions },
        centre: { label: "The centre brief", title: result.analysis.lenses.centre.headline, text: result.analysis.lenses.centre.analysis, questions: result.analysis.lenses.centre.questions },
        right: { label: "The right lens", title: result.analysis.lenses.right.headline, text: result.analysis.lenses.right.analysis, questions: result.analysis.lenses.right.questions },
      });
      setBackendStatus(`Three lenses generated via ${result.analysis.provider}`);
    } else setBackendStatus(result.error ?? "Analysis failed");
    setAnalyzing(false);
  }

  const storyTitle = article?.title ?? "What a new urban mobility plan could mean for growing Indian cities";
  const storyDeck = article?.summary ?? "The same policy can look like overdue public investment, a difficult delivery challenge, or an expensive intervention. The difference is often in the frame.";
  return <>
    <section className="news-hero page-shell"><div className="edition-line"><span>THE PERSPECTIVE DESK</span><span>PROTOTYPE EDITION · 01</span><span>READ WIDER, NOT LOUDER</span></div><div className="news-title"><h1>The daily brief,<br /><em>without the tunnel.</em></h1><p>A deliberate reading room for people who want facts, framing, and the questions each side is asking—not an infinite outrage feed.</p></div></section>
    <section className="lead-story page-shell" id="today">
      <div className="story-header"><p className="kicker">Today’s local briefing</p><span>6 min read · {article?.category ?? "Policy"}</span></div>
      <h2>{storyTitle}</h2><p className="story-deck">{storyDeck}</p>
      <div className="backend-state"><span>SYSTEM</span><p>{backendStatus}</p><button disabled={!article || analyzing} onClick={analyze} type="button">{analyzing ? "Analyzing…" : "Generate three lenses"}</button></div>
      <div className="fact-strip"><span>SHARED FACT BASE</span><p>{article ? `Stored source: ${article.source}. This local record must still pass source verification and editorial review before publication.` : "This is illustrative fallback copy, not a live news report."}</p></div>
      <div className="lens-switcher" role="group" aria-label="Choose a political perspective">{(Object.keys(lensData) as LensKey[]).map((key) => <button key={key} type="button" className={lens === key ? `lens-${key} is-active` : `lens-${key}`} onClick={() => setLens(key)}><span>{key === "left" ? "←" : key === "right" ? "→" : "●"}</span>{lensData[key].label}</button>)}</div>
      <article className={`lens-card lens-card--${lens}`} aria-live="polite"><div className="lens-card__rail"><span>{current.label}</span><b>{lens === "left" ? "L" : lens === "right" ? "R" : "C"}</b></div><div><h3>{current.title}</h3><p>{current.text}</p><div className="lens-questions">{current.questions.map((question) => <span key={question}>{question}</span>)}</div></div></article>
      <div className="editor-note"><span>EDITOR’S NOTE</span><p>Neutrality is not “the truth in the middle.” Generated lenses are drafts; publication requires source-level citations and accountable human review.</p></div>
      <button className="news-save" type="button" onClick={async () => { if (!authenticated) { window.location.assign("/auth?next=%2Fperspective%2Fdashboard"); return; } await fetch("/api/saved-items", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portal: "news", itemKey: article?.id ?? "sample-mobility", title: storyTitle, metadata: { lens } }) }); alert("Saved to your Perspective dashboard."); }}>{authenticated ? "Save this briefing" : "Sign in to save this briefing"} →</button>
    </section>
    <section className="news-method" id="method"><div className="page-shell"><div className="section-heading"><p className="kicker">How it earns trust</p><h2>Show the work.</h2></div><div className="method-grid"><article><span>01</span><h3>One fact base</h3><p>Claims trace back to clearly dated, linked primary and credible reporting sources.</p></article><article><span>02</span><h3>Declared framing</h3><p>Perspective labels describe the lens, not the reader.</p></article><article><span>03</span><h3>Human review</h3><p>AI can compare language; accountable editors resolve conflicts.</p></article><article><span>04</span><h3>Visible uncertainty</h3><p>Missing evidence and developing facts remain marked.</p></article></div></div></section>
  </>;
}
