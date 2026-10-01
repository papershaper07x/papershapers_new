"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PaperCard } from "./study-paper-library";
import type { StudyPaperRecord } from "./study-types";

const PAGE_SIZE = 12;

export function PaperArchive() {
  const [papers, setPapers] = useState<StudyPaperRecord[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [message, setMessage] = useState("Loading your paper archive…");
  const [loadingMore, setLoadingMore] = useState(false);

  async function load(offset: number, append: boolean) {
    const response = await fetch(`/api/study/papers?limit=${PAGE_SIZE}&offset=${offset}`);
    const result = await response.json() as { items?: StudyPaperRecord[]; has_more?: boolean; error?: string };
    if (!response.ok) throw new Error(result.error ?? "Could not load your papers.");
    setPapers((current) => append ? [...current, ...(result.items ?? [])] : (result.items ?? []));
    setHasMore(Boolean(result.has_more));
  }

  useEffect(() => { load(0, false).then(() => setMessage("")).catch((reason: Error) => setMessage(reason.message)); }, []);
  async function loadMore() { setLoadingMore(true); try { await load(papers.length, true); } catch (reason) { setMessage(reason instanceof Error ? reason.message : "Could not load more papers."); } finally { setLoadingMore(false); } }

  return <main className="study-route"><div className="study-route__bar page-shell"><Link href="/papershapers/dashboard">← Study desk</Link><span>Paper archive</span></div><section className="paper-archive page-shell"><div className="dashboard-heading"><div><p className="dash-label">PRIVATE PAPER ARCHIVE</p><h1>Every paper,<br /><em>kept in one place.</em></h1><p>Generated papers remain attached to your study account. Open one whenever you are ready to read, print, or attempt it again.</p></div><Link href="/papershapers/tests/new">New curriculum test →</Link></div>{message ? <p className="route-loading">{message}</p> : papers.length === 0 ? <p className="empty-state">No papers yet. Build your first curriculum test to begin this archive.</p> : <><div className="paper-library__grid">{papers.map((record) => <PaperCard key={record.id} record={record} />)}</div>{hasMore && <button className="button" type="button" disabled={loadingMore} onClick={loadMore}>{loadingMore ? "Loading papers…" : "Load more papers"}</button>}</>}</section></main>;
}
