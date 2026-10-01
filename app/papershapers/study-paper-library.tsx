"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StudyPaperRecord } from "./study-types";

export function PaperCard({ record }: { record: StudyPaperRecord }) {
  return <article><p>{record.paper_size === "full" ? "FULL PAPER" : "HALF PAPER"} · CLASS {record.grade}</p><Link className="paper-library__title" href={`/papershapers/papers/${record.id}`}>{record.paper.title}</Link><span>{record.paper.total_marks} marks · {record.paper.time_minutes} min · {record.provider}</span><div><Link href={`/papershapers/papers/${record.id}`}>Open paper →</Link><Link href={`/papershapers/papers/${record.id}/attempt`}>Take test →</Link></div></article>;
}

export function StudyPaperLibrary() {
  const [papers, setPapers] = useState<StudyPaperRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("Loading generated papers…");
  useEffect(() => { fetch("/api/study/papers?limit=4").then(async (response) => { const result = await response.json() as { items?: StudyPaperRecord[]; has_more?: boolean; error?: string }; if (!response.ok) throw new Error(result.error ?? "Could not load papers."); setPapers(result.items ?? []); setHasMore(Boolean(result.has_more)); setMessage(""); }).catch((reason: Error) => setMessage(reason.message)); }, []);
  return <section className="paper-library"><div className="dashboard-heading"><div><p className="dash-label">GENERATED PAPERS</p><h2>Open a paper. Take a test.</h2></div><Link href="/papershapers/tests/new">New curriculum test →</Link></div>{message ? <p className="route-loading">{message}</p> : papers.length === 0 ? <p className="empty-state">Your first generated paper will appear here.</p> : <><div className="paper-library__grid">{papers.map((record) => <PaperCard key={record.id} record={record} />)}</div><div className="paper-library__archive"><span>{hasMore ? "Showing your 4 newest papers." : "Every generated paper is saved in your private archive."}</span><Link href="/papershapers/papers">View complete archive →</Link></div></>}</section>;
}
