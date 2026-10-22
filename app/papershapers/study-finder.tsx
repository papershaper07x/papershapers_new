"use client";

import Link from "next/link";
import { useRef, useState } from "react";

const destinations = [
  { href: "/papershapers/tests/new", label: "Create a practice paper", detail: "Choose class, subject and chapters", keywords: "test exam generate builder" },
  { href: "/papershapers/dashboard", label: "My study desk", detail: "Return to your account and practice", keywords: "dashboard history progress" },
  { href: "/papershapers/papers", label: "My papers", detail: "Find your saved practice papers", keywords: "library archive attempts results" },
  { href: "/syllabus", label: "Explore the curriculum", detail: "Browse CBSE subjects and chapters", keywords: "syllabus class topics" },
  { href: "/papershapers/room", label: "Join a Live Room", detail: "Enter the room shared by your teacher", keywords: "code classroom student" },
  { href: "/papershapers/for-teachers", label: "For teachers", detail: "Plan practice for your classroom", keywords: "host coaching live rooms" },
  { href: "/papershapers/study-guide", label: "Study guide and FAQs", detail: "Get help with your next step", keywords: "help answers how" },
  { href: "/papershapers/journal", label: "Student journal", detail: "Read ideas and student notes", keywords: "articles writing" },
  { href: "/papershapers/contact", label: "Contact and feedback", detail: "Report a problem or suggest an idea", keywords: "support bug" },
  { href: "/papershapers/mobile", label: "Install the mobile app", detail: "Take Study to your home screen", keywords: "android download phone" },
];

export function StudyFinder() {
  const panel = useRef<HTMLDetailsElement>(null);
  const [query, setQuery] = useState("");
  const results = destinations.filter((item) => `${item.label} ${item.detail} ${item.keywords}`.toLowerCase().includes(query.trim().toLowerCase()));
  return <details className="study-finder" ref={panel} onKeyDown={(event) => {
    if (event.key === "Escape" && panel.current) {
      event.stopPropagation();
      panel.current.open = false;
      panel.current.querySelector("summary")?.focus();
    }
  }}>
    <summary>Find your way <span aria-hidden="true">↗</span></summary>
    <div className="study-finder__panel">
      <label htmlFor="study-destination">Where would you like to go?</label>
      <input id="study-destination" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Try chapters, rooms, or help…" autoComplete="off" aria-controls="study-destinations" />
      <p className="sr-only" role="status">{results.length} destinations found</p>
      <ul id="study-destinations">{results.map((item) => <li key={item.href}><Link prefetch={false} href={item.href} onClick={() => { if (panel.current) panel.current.open = false; setQuery(""); }}><strong>{item.label}</strong><span>{item.detail}</span></Link></li>)}</ul>
      {results.length === 0 && <p className="study-finder__empty">No matching destination. Try “paper”, “room”, or “help”, or <Link prefetch={false} href="/papershapers/contact">contact us</Link>.</p>}
      <p className="study-finder__hint">Search site destinations. Your papers and answers stay private.</p>
    </div>
  </details>;
}
