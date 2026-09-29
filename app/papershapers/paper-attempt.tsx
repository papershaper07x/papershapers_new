"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { StudyPaperRecord } from "./study-types";

export function PaperAttempt({ paperId }: { paperId: string }) {
  const [record, setRecord] = useState<StudyPaperRecord | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null);
  const [timeExpired, setTimeExpired] = useState(false);
  const storageKey = `paper-shapers-attempt:${paperId}`;
  useEffect(() => { fetch(`/api/study/papers/${paperId}`).then(async (response) => { const result = await response.json() as { paper?: StudyPaperRecord; error?: string }; if (!response.ok || !result.paper) throw new Error(result.error ?? "Paper not found."); const saved = window.localStorage.getItem(storageKey); const draft = saved ? JSON.parse(saved) as { answers?: Record<string, string>; deadline?: number } : null; setAnswers(draft?.answers ?? {}); const deadline = draft?.deadline && draft.deadline > Date.now() ? draft.deadline : Date.now() + result.paper.time_minutes * 60_000; window.localStorage.setItem(storageKey, JSON.stringify({ answers: draft?.answers ?? {}, deadline })); setSecondsLeft(Math.max(0, Math.ceil((deadline - Date.now()) / 1000))); setRecord(result.paper); }).catch((reason: Error) => setError(reason.message)); }, [paperId, storageKey]);
  useEffect(() => { if (!record || secondsLeft === null) return; const timer = window.setInterval(() => setSecondsLeft((current) => { const next = Math.max(0, (current ?? 0) - 1); if (next === 0) setTimeExpired(true); return next; }), 1000); return () => window.clearInterval(timer); }, [record, secondsLeft]);
  useEffect(() => { if (!record || secondsLeft === null) return; const saved = window.localStorage.getItem(storageKey); const deadline = saved ? (JSON.parse(saved) as { deadline?: number }).deadline : Date.now() + secondsLeft * 1000; window.localStorage.setItem(storageKey, JSON.stringify({ answers, deadline })); }, [answers, record, secondsLeft, storageKey]);
  const answered = useMemo(() => Object.values(answers).filter((answer) => answer.trim()).length, [answers]);
  const remainingTime = `${String(Math.floor((secondsLeft ?? 0) / 60)).padStart(2, "0")}:${String((secondsLeft ?? 0) % 60).padStart(2, "0")}`;
  async function submit() {
    if (!record) return;
    setSubmitting(true); setError("");
    const response = await fetch(`/api/study/papers/${paperId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: record.paper.questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })) }) });
    const result = await response.json() as { attempt?: { id: string }; error?: string };
    if (!response.ok || !result.attempt) { setError(result.error ?? "Your attempt could not be reviewed."); setSubmitting(false); return; }
    window.localStorage.removeItem(storageKey);
    window.location.assign(`/papershapers/papers/${paperId}/attempts/${result.attempt.id}`);
  }
  if (error && !record) return <main className="study-route page-shell"><p className="form-error">{error}</p></main>;
  if (!record) return <main className="study-route page-shell"><p className="route-loading">Setting up your attempt…</p></main>;
  return <main className="study-route"><div className="study-route__bar page-shell"><Link href={`/papershapers/papers/${paperId}`}>← Read paper</Link><span>{answered}/{record.paper.questions.length} answered</span></div><section className="attempt-layout page-shell"><aside className="attempt-summary"><p>Practice attempt</p><h1>{record.paper.subject}</h1><strong className={timeExpired ? "attempt-timer is-expired" : "attempt-timer"}>{timeExpired ? "TIME UP" : remainingTime}</strong><span>{record.paper.total_marks} marks · {record.paper.time_minutes} min</span><small>{timeExpired ? "Your draft is still here. Submit it now for formative feedback." : "Autosaving this attempt on this device. Your answers stay private until you submit."}</small><button type="button" className="button button--accent" disabled={submitting} onClick={submit}>{submitting ? "Reviewing…" : "Submit for practice feedback →"}</button>{error && <p className="form-error">{error}</p>}</aside><form className="attempt-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>{record.paper.questions.map((question) => <article key={question.id} className="attempt-question"><div><span>{question.id} · {question.chapter}</span><b>{question.marks} marks</b></div><h2>{question.text}</h2><label htmlFor={`answer-${question.id}`}>Your response</label><textarea id={`answer-${question.id}`} value={answers[question.id] ?? ""} onChange={(event) => setAnswers((current) => ({ ...current, [question.id]: event.target.value }))} placeholder="Show your reasoning, method, evidence, and final answer." rows={question.marks >= 4 ? 7 : 4} /></article>)}</form></section></main>;
}
