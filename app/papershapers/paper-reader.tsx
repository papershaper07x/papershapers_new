"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaperActions } from "./paper-feedback";
import type { StudyPaper, StudyPaperRecord } from "./study-types";
import { StudyIcon } from "./study-icon";
import { BoardQuestionContent } from "./board-question";

function sectionLabel(section: string) {
  return section.split(":", 1)[0]?.trim() || "Question";
}

function PaperBody({ paper }: { paper: StudyPaper }) {
  const sections = Array.from(new Set(paper.questions.map((q) => q.section)));
  const duration = paper.time_minutes % 60 === 0 ? `${paper.time_minutes / 60} hours` : `${Math.floor(paper.time_minutes / 60)} hours ${paper.time_minutes % 60} minutes`;
  return <>
    <header className="paper-reader__header">
      <p>Paper Shapers · {paper.exam_profile ? "Board mock draft" : "Selected-chapter practice"}</p>
      <h1>{paper.subject}{paper.exam_profile ? ` (${paper.exam_profile.subject_code})` : ""}</h1>
      <h2>Class {paper.grade} · {paper.board} · Question paper</h2>
      {paper.exam_profile && <p>Academic session {paper.exam_profile.session}</p>}
      <div><span>Time allowed: {duration}</span><span>Maximum marks: {paper.total_marks}</span></div>
    </header>
    <div className="exam-candidate" aria-label="Candidate details"><span>Name: <i /></span><span>Roll number: <i /></span></div>
    <aside className="paper-reader__notice">{paper.exam_profile ? <>Educator review pending. Structure follows the <a href={paper.exam_profile.sample_url}>official sample-paper profile</a>.</> : <>Adapted practice format covering selected chapters. Marks and question distribution may differ from your school or board examination.</>} Independently generated; questions and solutions require educator review.</aside>
    {paper.generation_source === "batch-recovery" && <p className="paper-reader__notice paper-reader__recovery">This paper reuses {paper.reused_questions} validated questions from an earlier request for the same brief. The remaining questions were generated to complete the paper.</p>}
    {paper.generation_source === "cached-recovery" && <p className="paper-reader__notice paper-reader__recovery">The paper service was temporarily unavailable, so this is a validated paper previously created from the same brief. It is now saved privately in your library.</p>}
    {paper.is_demo && <p className="paper-reader__notice">Illustrative prototype paper. These are demonstration questions, not a curriculum assessment.</p>}
    <section className="paper-reader__instructions"><h2>General instructions</h2><ol>{paper.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>
    <div className="paper-reader__questions">{sections.map((section) => {
      const questions = paper.questions.map((question, index) => ({ question, number: index + 1 })).filter(({ question }) => question.section === section);
      const marks = questions.reduce((sum, { question }) => sum + question.marks, 0);
      return <section className="exam-paper-section" key={section} aria-label={`Section ${sectionLabel(section)}`}>
        <header className="exam-section"><h2>Section {sectionLabel(section)}</h2><p>{questions.length} questions · {marks} marks</p></header>
        {questions.map(({ question, number }) => <article key={question.id} className="paper-question">
          <header className="paper-question__meta"><span className="paper-question__number">{number}.</span><strong aria-label={`${question.marks} marks`}>[{question.marks}]</strong></header>
          <div className="paper-question__content"><div className="paper-question__text"><BoardQuestionContent question={question} /></div></div>
        </article>)}
      </section>;
    })}</div>
    <p className="exam-paper-end">End of question paper</p>
  </>;
}

export function PaperReader({ paperId }: { paperId: string }) {
  const [record, setRecord] = useState<StudyPaperRecord | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    fetch(`/api/study/papers/${paperId}`).then(async (response) => {
      const result = await response.json() as { paper?: StudyPaperRecord; error?: string };
      if (!response.ok || !result.paper) throw new Error(result.error ?? "Paper not found.");
      setRecord(result.paper);
    }).catch((reason: Error) => setError(reason.message));
  }, [paperId]);
  if (error) return <main className="study-route page-shell"><p className="form-error">{error}</p><Link href="/papershapers/dashboard">Return to your study desk →</Link></main>;
  if (!record) return <main className="study-route page-shell"><p className="route-loading">Opening your paper…</p></main>;
  return <main className="study-route"><div className="study-route__bar page-shell no-print"><Link href="/papershapers/dashboard"><StudyIcon name="back" /> Study desk</Link><span>{record.paper.generation_source === "cached-recovery" ? "Recovered paper" : "Generated"} {new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><article className="paper-reader page-shell board-paper"><PaperBody paper={record.paper} /><div className="paper-reader__actions no-print"><Link className="button button--accent" href={`/papershapers/papers/${record.id}/attempt`}>Start practice <StudyIcon name="arrow" /></Link><button className="button" type="button" onClick={() => window.print()}><StudyIcon name="print" /> Print / save PDF</button><Link className="text-link" href="/papershapers/dashboard">Back to saved papers</Link></div><PaperActions paperId={record.id} /></article></main>;
}

export { PaperBody };
