import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { LocalBoard } from "./local-board";

export const metadata: Metadata = { title: "Noticeboard — What’s good nearby", description: "A friendly digital noticeboard for local offers, events, services, and discoveries." };
export default function NoticeboardPage() { return <main className="portal-page local-page"><SiteHeader portal="Noticeboard" /><LocalBoard /><SiteFooter /></main>; }
