"use client";

import Link from "next/link";

export default function StudyError({ reset }: { reset: () => void }) {
  return <main className="study-route page-shell"><h1>We couldn’t load this study page</h1><p>Please try again. If you were answering a paper, your browser draft is retained when draft saving is available.</p><button className="button button--dark" onClick={reset}>Try again</button><p><Link href="/papershapers">Return to Study</Link></p></main>;
}
