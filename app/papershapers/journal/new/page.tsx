import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { StudyInformationLayout } from "../../information-layout";
import { CommunityPostForm } from "../../community-post-form";

export const metadata: Metadata = { title: "Write a community note", description: "Share a practical Paper Shapers study note for editorial review." };

export default async function NewJournalPostPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fjournal%2Fnew");
  return <StudyInformationLayout eyebrow="Write a note" title={<>Pass on a useful<br /><em>little thing.</em></>} lede="Tell other learners or teachers about one practical routine. Your note is saved for review first; it is not a live chat or an instant public post.">
    <section className="study-information__section page-shell journal-compose"><div><p className="kicker">Your byline</p><h2>{user.name}</h2><p>We use the first name from your Paper Shapers account when a note is approved. Please leave out full names, marks, contact details, copied answers, and anything you would not want visible on a public study page.</p></div><CommunityPostForm /></section>
  </StudyInformationLayout>;
}
