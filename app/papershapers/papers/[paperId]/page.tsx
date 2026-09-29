import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { PaperReader } from "../../paper-reader";

export default async function StudyPaperPage({ params }: { params: Promise<{ paperId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fdashboard&mode=login");
  const { paperId } = await params;
  return <PaperReader paperId={paperId} />;
}

