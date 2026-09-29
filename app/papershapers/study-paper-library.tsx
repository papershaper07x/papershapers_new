"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudyPaperRecord } from "./study-types";

export function StudyPaperLibrary() {
  const [papers, setPapers] = useState<StudyPaperRecord[]>([]);
  const [message, setMessage] = useState("Loading generated papers…");
  useEffect(() => { fetch("/api/study/papers").then(async (response) => { const result = await response.json() as { items?: StudyPaperRecord[]; error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not load papers."); setPapers(result.items ?? []); setMessage(""); }).catch((reason: Error) => setMessage(reason.message)); }, []);
  return <section className="paper-library"><div className="dashboard-heading"><div><p className="dash-label">GENERATED PAPERS</p><h2>Open a paper. Take a test.</h2></div><Link href="/papershapers/tests/new">New curriculum test →</Link></div>{message ? <p className="route-loading">{message}</p> : papers.length === 0 ? <p className="empty-state">Your first generated paper will appear here.</p> : <div className="paper-library__grid">{papers.map((record) => <article key={record.id}><p>{record.paper_size === "full" ? "FULL PAPER" : "HALF PAPER"} · CLASS {record.grade}</p><h3>{record.paper.title}</h3><span>{record.paper.total_marks} marks · {record.paper.time_minutes} min · {record.provider}</span><div><Link href={`/papershapers/papers/${record.id}`}>View paper</Link><Link href={`/papershapers/papers/${record.id}/attempt`}>Take test →</Link></div></article>)}</div>}</section>;
}
