import { redirect } from "next/navigation";
import { SiteHeader } from "../../components/SiteChrome";
import { getCurrentUser } from "../../../lib/auth";
import { PaperArchive } from "../paper-archive";

export default async function PaperArchivePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fpapers&mode=login");
  return <><SiteHeader portal="study" user={user} /><PaperArchive /></>;
}
