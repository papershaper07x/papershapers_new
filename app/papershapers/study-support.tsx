"use client";

import { useState } from "react";

const routes = {
  "start": { title: "Start with the chapter, not a blank prompt.", text: "Open the planner, choose your mapped class and subject, then select only the chapters your school has covered. Start with a half paper if you are unsure.", action: "Open the planner", href: "/papershapers/tests/new" },
  "stuck": { title: "Make the next step smaller.", text: "Choose one chapter, use Quick check, and set a 20-minute attempt. Review the answer outline only after writing your own response.", action: "Plan a quick check", href: "/papershapers/tests/new" },
  "result": { title: "Turn a result into a revision task.", text: "Use the question-level feedback to name one missing step, definition, or calculation. Then make your next brief focus on that chapter instead of repeating the full paper.", action: "Open study desk", href: "/papershapers/dashboard" },
  "teacher": { title: "Use the same source map across a class.", text: "Teachers and coaching teams can use one chapter selection as a review brief, while each learner keeps private attempts and feedback. We are preparing a small pilot workflow for shared briefs and educator review.", action: "Explore the planner", href: "/papershapers/tests/new" },
} as const;

const faqs = [
  ["Does the guide answer every homework question?", "No. It helps students choose the correct Paper Shapers workflow. Generated papers and answer outlines remain practice material that needs educator review."],
  ["Can I change a question after a paper is generated?", "A completed paper stays fixed so an attempt remains meaningful. Create a new brief with a different chapter focus, size, or revision goal instead."],
  ["Can I download a paper?", "Yes. Open the generated paper and choose Print / save as PDF. Your browser will let you save a PDF without uploading the paper anywhere."],
  ["Can teachers or coaching classes use this?", "Yes. The current workflow supports source-aware brief creation and private learner attempts. Shared-class administration and educator review are planned pilot features."],
] as const;

export function StudySupport({ authenticated, contactEmail }: { authenticated: boolean; contactEmail?: string }) {
  const [selected, setSelected] = useState<keyof typeof routes>("start");
  const answer = routes[selected];
  const destination = authenticated ? answer.href : `/auth?next=${encodeURIComponent(answer.href)}`;
  return <section className="study-support page-shell" id="support"><div className="section-heading"><p className="kicker">Study guide</p><h2>Ask for a next step, not a generic answer.</h2><p>This guide is rule-based. It does not send your question to a model or use your study history to make hidden decisions.</p></div><div className="study-support__grid"><div className="study-support__prompts" aria-label="Choose what you need help with">{Object.keys(routes).map((key) => <button className={selected === key ? "is-active" : ""} type="button" key={key} onClick={() => setSelected(key as keyof typeof routes)}>{key === "start" ? "I need to start" : key === "stuck" ? "I am stuck on a chapter" : key === "result" ? "I finished a paper" : "I teach or run a coaching class"}<span>→</span></button>)}</div><article className="study-support__answer"><p className="kicker">Suggested next move</p><h3>{answer.title}</h3><p>{answer.text}</p><a className="button button--accent" href={destination}>{answer.action} →</a></article></div><div className="study-support__lower"><div><p className="kicker">Questions, answered</p><div className="faq-list">{faqs.map(([question, reply]) => <details key={question}><summary>{question}</summary><p>{reply}</p></details>)}</div></div><aside id="connect"><p className="kicker">For schools and coaching teams</p><h3>Make paper-setting less repetitive.</h3><p>Use source-aware briefs, private attempts, downloadable papers, and feedback review to support revision without replacing teacher judgement.</p>{contactEmail ? <a className="text-link" href={`mailto:${contactEmail}?subject=${encodeURIComponent("Paper Shapers school or coaching pilot")}`}>Connect with Paper Shapers →</a> : <p className="contact-note">A school/coaching contact channel can be enabled with `STUDY_CONTACT_EMAIL` when you are ready to receive pilot enquiries.</p>}</aside></div></section>;
}
