import type { Metadata } from "next";
import Link from "next/link";
import { ScrollReveal } from "../../components/ScrollReveal";
import { listPublishedCommunityPosts } from "../../../db/service";
import { StudyInformationLayout } from "../information-layout";

export const metadata: Metadata = {
  title: "Journal and community notes",
  description: "Paper Shapers study notes, walkthroughs, and moderated student community posts for CBSE Classes 1–12.",
};

function dateLabel(value: string | null) {
  return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value ?? "2026-09-29T00:00:00.000Z"));
}

export default async function JournalPage() {
  const posts = await listPublishedCommunityPosts();
  return <StudyInformationLayout eyebrow="Paper Shapers Journal" title={<>A place for the <em>useful notes.</em></>} lede="Short study walkthroughs, teacher-friendly ideas, and student notes that are reviewed before they appear. No noisy feed. No public marks. Just things worth returning to.">
    <section className="study-information__section page-shell journal-intro">
      <ScrollReveal className="journal-intro__copy"><p className="kicker">Read, then add your own</p><h2>Small notes can make a big revision plan feel possible.</h2><p>Read the starter guides, share a practical study idea, or describe a workflow that helped you. Submitted notes stay private until a Paper Shapers editor reviews them.</p><div className="journal-intro__actions"><Link className="button button--accent" href="/papershapers/journal/new">Write a note →</Link><Link className="text-button" href="/papershapers/contact">Suggest a longer guide</Link></div></ScrollReveal>
      <aside className="journal-rules"><p className="kicker">A calm corner</p><ul><li>Use your first name only.</li><li>Do not share answers, roll numbers, or personal contact details.</li><li>Every student note is reviewed before it is published.</li></ul></aside>
    </section>
    <section className="study-information__section page-shell"><div className="journal-heading"><div><p className="kicker">The reading shelf</p><h2>Start here.</h2></div><p>These three starter guides are written and published by the Paper Shapers editorial team. Future published student notes will be clearly attributed.</p></div><div className="journal-grid">{posts.map((post, index) => <ScrollReveal key={post.id} className={`journal-card journal-card--${index % 3}`}><article><div><p className="journal-card__meta">{post.is_internal ? "Paper Shapers guide" : "Community note"} · {dateLabel(post.published_at)}</p><h3>{post.title}</h3><p>{post.summary}</p></div><div><span>By {post.author_label}</span><Link href={`/papershapers/journal/${post.slug}`}>Read note →</Link></div></article></ScrollReveal>)}</div></section>
  </StudyInformationLayout>;
}
