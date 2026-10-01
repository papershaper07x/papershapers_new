import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublishedCommunityPost } from "../../../../db/service";
import { StudyInformationLayout } from "../../information-layout";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPublishedCommunityPost((await params).slug);
  return post ? { title: post.title, description: post.summary } : { title: "Journal note" };
}

export default async function JournalPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPublishedCommunityPost((await params).slug);
  if (!post) notFound();
  return <StudyInformationLayout eyebrow={post.is_internal ? "Paper Shapers guide" : "Community note"} title={post.title} lede={post.summary}>
    <article className="study-information__section page-shell journal-story"><p className="journal-card__meta">By {post.author_label} · Published {new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" }).format(new Date(post.published_at ?? post.created_at))}</p><div>{post.body.split("\n").map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div><aside><p>This is a learning note, not official CBSE material or academic advice. Check your school’s syllabus and teacher guidance for final preparation.</p></aside><Link className="text-button" href="/papershapers/journal">← Back to the Journal</Link></article>
  </StudyInformationLayout>;
}
