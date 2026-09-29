import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { TestPlanner } from "../../test-planner";

export default async function NewTestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Ftests%2Fnew&mode=login");
  return <TestPlanner />;
}

