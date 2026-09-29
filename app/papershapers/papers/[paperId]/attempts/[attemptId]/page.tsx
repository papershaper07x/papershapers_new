import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../../../lib/auth";
import { AttemptResult } from "../../../../attempt-result";

export default async function StudyResultPage({ params }: { params: Promise<{ paperId: string; attemptId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fdashboard&mode=login");
  const { paperId, attemptId } = await params;
  return <AttemptResult paperId={paperId} attemptId={attemptId} />;
}

