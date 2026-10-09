"use client";
import { hasAttemptAnswer } from "./has-attempt-answer";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAttemptDraft } from "./use-attempt-draft";
import { QuestionNavigator } from "./question-navigator";
import { QuestionInput } from "./question-input";
import type { StudyPaperRecord } from "./study-types";

export function PaperAttempt({ paperId }: { paperId: string }) {
  const [record, setRecord] = useState<StudyPaperRecord | null>(null);
  const storageKey = `paper-shapers-attempt:${paperId}`;
  const { answers, setAnswers, secondsLeft, ready, storageWarning, clearDraft } = useAttemptDraft(storageKey, record?.paper.time_minutes ?? null);
  const timeExpired = ready && secondsLeft === 0;
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/study/papers/${paperId}`).then(async (response) => {
      const result = await response.json() as { paper?: StudyPaperRecord; error?: string };
      if (!response.ok || !result.paper) throw new Error(result.error ?? "Paper not found.");
      setRecord(result.paper);
    }).catch((reason: Error) => setError(reason.message));
  }, [paperId]);
  const answered = useMemo(() => Object.values(answers).filter(hasAttemptAnswer).length, [answers]);
  const remainingTime = `${String(Math.floor((secondsLeft ?? 0) / 60)).padStart(2, "0")}:${String((secondsLeft ?? 0) % 60).padStart(2, "0")}`;
  async function submit() {
    if (!record || submitting) return;
    if (!confirmSubmit && answered < record.paper.questions.length) { setConfirmSubmit(true); return; }
    setSubmitting(true); setError("");
    try {
      const response = await fetch(`/api/study/papers/${paperId}/attempts`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answers: record.paper.questions.map((question) => ({ questionId: question.id, answer: answers[question.id] ?? "" })) }) });
      const result = await response.json() as { attempt?: { id: string }; error?: string };
      if (!response.ok || !result.attempt) throw new Error(result.error ?? "Your attempt could not be reviewed.");
      clearDraft();
      window.location.assign(`/papershapers/papers/${paperId}/attempts/${result.attempt.id}`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Connection failed. Your draft is saved; try submitting again.");
      setSubmitting(false);
    }
  }

  if (error && !record) return <main className="study-route page-shell"><p className="form-error">{error}</p></main>;
  if (!record || !ready) return <main className="study-route page-shell"><p className="route-loading">Setting up your attempt…</p></main>;
  return <main className="study-route"><div className="study-route__bar page-shell"><Link href={`/papershapers/papers/${paperId}`}>← Read paper</Link><span>{answered}/{record.paper.questions.length} answered</span></div><section className="attempt-layout page-shell"><aside className="attempt-summary"><p>Practice attempt</p><h1>{record.paper.subject}</h1><strong className={timeExpired ? "attempt-timer is-expired" : "attempt-timer"}>{timeExpired ? "TIME UP" : remainingTime}</strong><QuestionNavigator questions={record.paper.questions} answers={answers} /><span>{record.paper.total_marks} marks · {record.paper.time_minutes} min</span><small>{timeExpired ? "Your draft is still here. Submit it now for formative feedback." : "Autosaving this attempt on this device. Drafts are stored on this browser for up to 24 hours; avoid shared devices."}</small><button type="button" className="button button--accent" disabled={submitting} onClick={submit}>{submitting ? "Reviewing…" : "Submit for practice feedback →"}</button>{confirmSubmit && <p role="status">{record.paper.questions.length - answered} unanswered. Press submit again to send this attempt, or continue answering.</p>}{storageWarning && <p role="status">{storageWarning}</p>}{error && <p className="form-error" role="alert">{error}</p>}</aside><form className="attempt-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>{record.paper.questions.map((question) => <QuestionInput key={question.id} question={question} value={answers[question.id] ?? ""} onChange={(val) => setAnswers((current) => ({ ...current, [question.id]: val }))} />)}</form></section></main>;
}
