import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { SiteHeader } from "../../../components/SiteChrome";
import { PaperReader } from "../../paper-reader";

export default async function StudyPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/papershapers/papers/${paperId}`)}&mode=login`);
  return <>
    <SiteHeader portal="study" user={user} />
    <PaperReader paperId={paperId} />
  </>;
}
