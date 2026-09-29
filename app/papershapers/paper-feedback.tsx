"use client";

import { useState } from "react";

const choices = [
  ["good-fit", "This paper matched my revision"],
  ["difficulty", "The difficulty needs adjustment"],
  ["wording", "A question was unclear"],
  ["coverage", "A chapter or skill was missing"],
  ["other", "Something else"],
] as const;

export function PaperActions({ paperId }: { paperId: string }) {
  const [category, setCategory] = useState<(typeof choices)[number][0]>("good-fit");
  const [comment, setComment] = useState("");
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);

  async function sendFeedback() {
    setSaving(true);
    setStatus("");
    const response = await fetch(`/api/study/papers/${paperId}/feedback`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ category, comment }) });
    const result = await response.json() as { error?: string };
    setSaving(false);
    setStatus(response.ok ? "Thank you — this is saved for product review." : result.error ?? "Feedback could not be saved right now.");
  }

  return <section className="paper-feedback no-print" aria-labelledby="paper-feedback-title">
    <div><p className="kicker">Improve the next brief</p><h2 id="paper-feedback-title">Was this paper useful?</h2><p>Your note is stored for review. It never changes this paper, your score, or another learner’s work automatically.</p></div>
    <div className="paper-feedback__controls"><div className="paper-feedback__choices">{choices.map(([value, label]) => <button key={value} className={category === value ? "is-active" : ""} type="button" onClick={() => setCategory(value)}>{label}</button>)}</div><label htmlFor="paper-feedback-comment">Optional detail<textarea id="paper-feedback-comment" value={comment} maxLength={1200} onChange={(event) => setComment(event.target.value)} placeholder="For example: add more diagram questions from Electricity." /></label><div className="paper-feedback__actions"><button className="button button--dark" type="button" disabled={saving} onClick={sendFeedback}>{saving ? "Saving…" : "Send feedback"}</button><button className="text-button" type="button" onClick={() => window.print()}>Print / save as PDF</button></div>{status && <p className={status.startsWith("Thank") ? "feedback-success" : "form-error"}>{status}</p>}</div>
  </section>;
}
