import Link from "next/link";

export default function NotFound() {
  return <main className="study-route page-shell"><p className="kicker">Paper Shapers · 404</p><h1>This page wasn’t found</h1><p>Check the link or continue with a study activity.</p><Link className="button button--dark" href="/papershapers">Open Study</Link><p><Link href="/syllabus">Browse curriculum</Link> · <Link href="/papershapers/contact">Report a broken link</Link></p></main>;
}
