"use client";

import { useMemo, useState } from "react";
import { useAttemptDraft } from "../../use-attempt-draft";
import { useRouter } from "next/navigation";
import { submitTestAction } from "./actions";
import { QuestionNavigator } from "../../question-navigator";
import { QuestionInput } from "../../question-input";
import type { StudyPaper, StudyQuestion } from "../../study-types";

export function LiveRoomAttempt({ roomId, attendeeId, paper }: { roomId: string; attendeeId: string; paper: StudyPaper }) {
  const router = useRouter();
  const { answers, setAnswers, secondsLeft, ready, storageWarning, clearDraft } = useAttemptDraft(`paper-shapers-room:${roomId}:${attendeeId}`, paper.time_minutes);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const answeredCount = useMemo(
    () => Object.values(answers).filter((val) => val && val.trim().length > 0).length,
    [answers]
  );

  async function submit() {
    if (submitting || !ready) return;
    if (!confirmSubmit && answeredCount < paper.questions.length) { setConfirmSubmit(true); return; }
    setSubmitting(true);
    setError("");
    try {
      await submitTestAction(roomId, attendeeId, answers);
      clearDraft();
      setSubmitted(true);
      router.refresh();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to submit test. Please try again.");
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <main className="dashboard-page page-shell" style={{ maxWidth: "600px", margin: "4rem auto", textAlign: "center" }}>
        <p className="dash-overline">SESSION SUBMITTED</p>
        <h1>Test Submitted Successfully</h1>
        <p style={{ marginTop: "1rem", lineHeight: "1.6" }}>
          Your responses for <strong>{paper.title || paper.subject}</strong> have been recorded and sent directly to your teacher&apos;s dashboard.
        </p>
        <p style={{ marginTop: "1rem", color: "var(--muted)" }}>You may now safely close this window.</p>
      </main>
    );
  }

  return (
    <main className="study-route">
      <div className="study-route__bar page-shell">
        <span>Live Room: {roomId}</span>
        <span>{answeredCount} of {paper.questions.length} answered</span>
      </div>
      <section className="attempt-layout page-shell">
        <aside className="attempt-summary">
          <p className="dash-overline">LIVE ATTEMPT</p>
          <h1>{paper.subject}</h1>
          <strong className="attempt-timer">{Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}</strong>
          <small>Personal practice timer. Your teacher controls when the room closes. Drafts are saved on this browser for up to 24 hours.</small>
          {storageWarning && <p role="status">{storageWarning}</p>}
          {confirmSubmit && <p role="status">{paper.questions.length - answeredCount} unanswered. Press submit again to send, or continue answering.</p>}
          <QuestionNavigator questions={paper.questions} answers={answers} />
          <span>{paper.total_marks} marks · {paper.time_minutes} min</span>
          <p><small>Your responses will be visible to your teacher as soon as you submit.</small></p>
          <button
            type="button"
            className="button button--accent"
            disabled={submitting || !ready}
            onClick={submit}
            style={{ width: "100%", marginTop: "1rem" }}
          >
            {submitting ? "Submitting..." : "Submit Test →"}
          </button>
          {error && <p className="form-error" style={{ marginTop: "1rem" }}>{error}</p>}
        </aside>
        <form className="attempt-form" onSubmit={(event) => { event.preventDefault(); submit(); }}>
          {paper.questions.map((question: StudyQuestion) => (
            <QuestionInput
              key={question.id}
              question={question}
              value={answers[question.id] ?? ""}
              onChange={(val) => setAnswers((current) => ({ ...current, [question.id]: val }))}
            />
          ))}
        </form>
      </section>
    </main>
  );
}
