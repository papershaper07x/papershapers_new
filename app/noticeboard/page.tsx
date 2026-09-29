import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { LocalBoard } from "./local-board";
import { AccountNudge } from "../components/AccountNudge";
import { getCurrentUser } from "../../lib/auth";

export const metadata: Metadata = { title: "Noticeboard — What’s good nearby", description: "A friendly digital noticeboard for local offers, events, services, and discoveries." };
export default async function NoticeboardPage() { const user = await getCurrentUser(); return <main className="portal-page local-page"><SiteHeader portal="marketplace" user={user} /><LocalBoard authenticated={Boolean(user)} />{!user && <AccountNudge portal="marketplace" next="/noticeboard/dashboard" />}<SiteFooter portal="marketplace" /></main>; }
