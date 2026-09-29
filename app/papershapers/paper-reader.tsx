"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaperActions } from "./paper-feedback";
import type { StudyPaper, StudyPaperRecord } from "./study-types";

function PaperBody({ paper }: { paper: StudyPaper }) {
  return <>
    <header className="paper-reader__header"><p>Paper Shapers · Study Lab</p><h1>{paper.title}</h1><div><span>{paper.board} · Class {paper.grade}</span><span>{paper.total_marks} marks</span><span>{paper.time_minutes} minutes</span></div></header>
    {paper.generation_source === "cached-recovery" && <p className="paper-reader__notice">The paper service was temporarily unavailable, so this is a validated paper previously created from the same brief. It is now saved privately in your library.</p>}
    {paper.is_demo && <p className="paper-reader__notice">Practice paper generated as a prototype. Questions and answer outlines need educator review before classroom use.</p>}
    <section className="paper-reader__instructions"><h2>General instructions</h2><ol>{paper.instructions.map((instruction) => <li key={instruction}>{instruction}</li>)}</ol></section>
    <div className="paper-reader__questions">{paper.questions.map((question) => <article key={question.id} className="paper-question"><div><span>{question.section}</span><b>{question.id}</b></div><p className="paper-question__chapter">{question.chapter} · {question.type.replaceAll("-", " ")}</p><h2>{question.text}</h2><strong>{question.marks} mark{question.marks === 1 ? "" : "s"}</strong></article>)}</div>
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
  return <main className="study-route"><div className="study-route__bar page-shell no-print"><Link href="/papershapers/dashboard">← Study desk</Link><span>{record.paper.generation_source === "cached-recovery" ? "Recovered paper" : "Generated"} {new Date(record.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div><article className="paper-reader page-shell"><PaperBody paper={record.paper} /><div className="paper-reader__actions no-print"><Link className="button button--accent" href={`/papershapers/papers/${record.id}/attempt`}>Start an attempt →</Link><Link className="text-link" href="/papershapers/dashboard">Save this for later</Link></div><PaperActions paperId={record.id} /></article></main>;
}

export { PaperBody };
