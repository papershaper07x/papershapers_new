import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../../../lib/auth";
import { AttemptResult } from "../../../../attempt-result";

export default async function StudyResultPage({ params }: { params: Promise<{ paperId: string; attemptId: string }> }) {
  const { paperId, attemptId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect(`/auth?next=${encodeURIComponent(`/papershapers/papers/${paperId}/attempts/${attemptId}`)}&mode=login`);
  return <AttemptResult paperId={paperId} attemptId={attemptId} />;
}
