import { redirect } from "next/navigation";
import { getCurrentUser } from "../../../../lib/auth";
import { TestPlanner } from "../../test-planner";

import { SiteHeader } from "../../../components/SiteChrome";

export default async function NewTestPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Ftests%2Fnew&mode=login");
  return <>
    <SiteHeader portal="study" user={user} />
    <div className="page-shell study-plan-note"><p>Free practice or optional priority access. <a className="text-link" href="/papershapers#plans">Compare generation limits and Study Plus →</a></p></div>
    <TestPlanner />
  </>;
}

