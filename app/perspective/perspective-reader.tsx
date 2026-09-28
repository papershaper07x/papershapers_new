"use client";

import { useState } from "react";

const lenses = {
  left: { label: "The left lens", title: "Public investment is the missing piece", text: "This framing asks whether stronger public transport and shared infrastructure can reduce inequality while supporting climate goals. It prioritises access, public value, and who may be left behind by a purely market-led transition.", questions: ["Who benefits first?", "Is access being treated as a public good?"] },
  centre: { label: "The centre brief", title: "The plan depends on delivery", text: "This framing focuses on implementation: funding, timelines, capacity, and measurable outcomes. It weighs the stated benefits against execution risks and separates what has been announced from what has actually changed.", questions: ["What is funded today?", "Which outcome can be measured?"] },
  right: { label: "The right lens", title: "Costs and choice need more scrutiny", text: "This framing questions whether regulation and public spending could restrict choice or burden taxpayers. It prioritises market competition, fiscal discipline, and whether private operators can deliver the same outcome more efficiently.", questions: ["What will this cost taxpayers?", "Could competition solve it better?"] },
};

export function PerspectiveReader() {
  const [lens, setLens] = useState<keyof typeof lenses>("centre");
  const current = lenses[lens];
  return <>
    <section className="news-hero page-shell"><div className="edition-line"><span>THE PERSPECTIVE DESK</span><span>PROTOTYPE EDITION · 01</span><span>READ WIDER, NOT LOUDER</span></div><div className="news-title"><h1>One story.<br /><em>Three honest lenses.</em></h1><p>A calmer way to read the news. See how different political viewpoints frame the same facts, then form your own view.</p></div></section>
    <section className="lead-story page-shell">
      <div className="story-header"><p className="kicker">Today’s sample briefing</p><span>6 min read · Policy</span></div>
      <h2>What a new urban mobility plan could mean for growing Indian cities</h2>
      <p className="story-deck">The same policy can look like overdue public investment, a difficult delivery challenge, or an expensive intervention. The difference is often in the frame.</p>
      <div className="fact-strip"><span>SHARED FACT BASE</span><p>This is a product demonstration using illustrative copy, not a live news report. A production version will show dated sources and links before any analysis.</p></div>
      <div className="lens-switcher" role="group" aria-label="Choose a political perspective">{(Object.keys(lenses) as Array<keyof typeof lenses>).map((key) => <button key={key} type="button" className={lens === key ? `lens-${key} is-active` : `lens-${key}`} onClick={() => setLens(key)}><span>{key === "left" ? "←" : key === "right" ? "→" : "●"}</span>{lenses[key].label}</button>)}</div>
      <article className={`lens-card lens-card--${lens}`} aria-live="polite"><div className="lens-card__rail"><span>{current.label}</span><b>{lens === "left" ? "L" : lens === "right" ? "R" : "C"}</b></div><div><h3>{current.title}</h3><p>{current.text}</p><div className="lens-questions">{current.questions.map((q) => <span key={q}>{q}</span>)}</div></div></article>
      <div className="editor-note"><span>EDITOR’S NOTE</span><p>Neutrality is not “the truth in the middle.” The centre view here is an evidence-and-execution lens. Every summary should distinguish reported fact, interpretation, and missing information.</p></div>
    </section>
    <section className="news-method"><div className="page-shell"><div className="section-heading"><p className="kicker">How it earns trust</p><h2>Show the work.</h2></div><div className="method-grid"><article><span>01</span><h3>One fact base</h3><p>Claims trace back to clearly dated, linked primary and credible reporting sources.</p></article><article><span>02</span><h3>Declared framing</h3><p>Perspective labels describe the lens, not the reader. No hidden editorial voice.</p></article><article><span>03</span><h3>Human review</h3><p>AI can compare language; accountable editors resolve conflicts and publish corrections.</p></article><article><span>04</span><h3>Visible uncertainty</h3><p>Missing evidence, disputed numbers, and developing facts remain clearly marked.</p></article></div></div></section>
  </>;
}
