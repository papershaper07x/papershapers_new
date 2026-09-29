import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { PerspectiveReader } from "./perspective-reader";
import { AccountNudge } from "../components/AccountNudge";
import { getCurrentUser } from "../../lib/auth";

export const metadata: Metadata = { title: "Perspective — News without the tunnel vision", description: "Compare how different viewpoints frame the same story." };

export default async function PerspectivePage() {
  const user = await getCurrentUser();
  return <main className="portal-page news-page"><SiteHeader portal="news" user={user} /><PerspectiveReader authenticated={Boolean(user)} />{!user && <AccountNudge portal="news" next="/perspective/dashboard" />}<SiteFooter portal="news" /></main>;
}
