"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudyAttempt } from "./study-types";

export function AttemptResult({ paperId, attemptId }: { paperId: string; attemptId: string }) {
  const [attempt, setAttempt] = useState<StudyAttempt | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { fetch(`/api/study/papers/${paperId}/attempts/${attemptId}`).then(async (response) => { const result = await response.json() as { attempt?: { score?: StudyAttempt }; error?: string }; if (!response.ok || !result.attempt?.score) throw new Error(result.error ?? "Attempt not found."); setAttempt(result.attempt.score); }).catch((reason: Error) => setError(reason.message)); }, [paperId, attemptId]);
  if (error) return <main className="study-route page-shell"><p className="form-error">{error}</p><Link href="/papershapers/dashboard">Return to your study desk →</Link></main>;
  if (!attempt) return <main className="study-route page-shell"><p className="route-loading">Vibe checking your work…</p></main>;

  return (
    <main className="study-route">
      <section className="result-hero page-shell" style={{ padding: '3rem 0', textAlign: 'center', background: '#f8f5ed', borderRadius: '12px', marginBottom: '2rem' }}>
        <p style={{ color: '#854d0e', fontWeight: 600, letterSpacing: '0.05em' }}>VIBE CHECK · {attempt.provider}</p>
        <h1 style={{ fontSize: '4rem', margin: '0.5rem 0', color: '#101d38' }}>{attempt.percentage}%</h1>
        <strong style={{ fontSize: '1.25rem', color: '#374151', display: 'block', marginBottom: '1rem' }}>{attempt.earned_marks} / {attempt.total_marks} marks secured</strong>
        <p style={{ maxWidth: '600px', margin: '0 auto 1.5rem', fontSize: '1.1rem', color: '#4b5563' }}>{attempt.summary}</p>

        {attempt.verification && (
          <aside className="verification-note" style={{ background: '#e0f2fe', color: '#0369a1', padding: '1rem', borderRadius: '8px', display: 'inline-block', marginBottom: '2rem' }}>
            <strong>{attempt.verification.status === "validated" ? "Model verified" : "Local rubric used"}</strong>
            <p style={{ margin: '0.25rem 0 0', fontSize: '0.9rem' }}>{attempt.verification.detail}</p>
          </aside>
        )}

        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
          <Link className="button button--accent" href={`/papershapers/papers/${paperId}/attempt`}>Try again</Link>
          <Link className="button button--dark" href="/papershapers/dashboard">Back to study desk</Link>
        </div>
      </section>

      <section className="result-breakdown page-shell">
        <div className="result-breakdown__heading" style={{ marginBottom: '2rem', textAlign: 'center' }}>
          <p className="kicker">The receipts</p>
          <h2>Question-by-question breakdown</h2>
          <p>See exactly where you cooked and where you fumbled.</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {attempt.breakdown.map((item) => (
            <article key={item.question_id} style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '12px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '1rem', marginBottom: '1rem' }}>
                <strong style={{ fontSize: '1.1rem', color: '#111827' }}>Q: {item.question_id}</strong>
                <span style={{ background: '#f3f4f6', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontWeight: 600, fontSize: '0.9rem' }}>{item.earned_marks} / {item.available_marks} marks</span>
              </div>

              <section className="review-block" style={{ marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Question</span>
                <h3 style={{ fontSize: '1.1rem', margin: '0.25rem 0 0', color: '#1f2937' }}>{item.question_text || "Question details were not stored for this earlier attempt."}</h3>
              </section>

              <section className="review-block review-block--response" style={{ marginBottom: '1.5rem', background: '#f9fafb', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #d1d5db' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#6b7280', fontWeight: 700 }}>Your Answer</span>
                <p style={{ margin: '0.5rem 0 0', fontStyle: 'italic', color: '#4b5563' }}>{item.student_answer || "No answer was submitted for this question."}</p>
              </section>

              <section className="review-block review-block--feedback" style={{ marginBottom: '1.5rem', background: '#ecfdf5', padding: '1rem', borderRadius: '8px', borderLeft: '4px solid #10b981' }}>
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', color: '#065f46', fontWeight: 700 }}>Feedback / Next Steps</span>
                <p style={{ margin: '0.5rem 0 0', color: '#064e3b' }}>{item.feedback}</p>
              </section>

              <details className="review-outline" style={{ background: '#fef3c7', padding: '1rem', borderRadius: '8px', color: '#92400e' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 600 }}>Open correct answer outline</summary>
                <p style={{ marginTop: '0.5rem', borderTop: '1px solid #fde68a', paddingTop: '0.5rem' }}>{item.answer_outline}</p>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
