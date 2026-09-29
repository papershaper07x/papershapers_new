import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../../lib/auth";
import { PaperAttempt } from "../../../paper-attempt";

export default async function StudyAttemptPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fdashboard&mode=login");
  const { paperId } = await params;
  return <PaperAttempt paperId={paperId} />;
}

