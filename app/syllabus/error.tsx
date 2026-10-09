"use client";

import Link from "next/link";

export default function SyllabusError({ reset }: { reset: () => void }) {
  return <main className="study-route page-shell"><h1>Curriculum temporarily unavailable</h1><p>The curriculum service could not be reached. Please try again shortly.</p><button className="button button--dark" onClick={reset}>Try again</button><p><Link href="/papershapers">Return to Study</Link></p></main>;
}
