import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../../lib/auth";
import { PaperAttempt } from "../../../paper-attempt";

export default async function StudyAttemptPage({ params }: { params: Promise<{ paperId: string }> }) {
  const { paperId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/papershapers/papers/${paperId}/attempt`)}&mode=login`);
  return <PaperAttempt paperId={paperId} />;
}
