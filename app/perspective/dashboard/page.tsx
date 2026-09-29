import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../components/SiteChrome";
import { SignOutButton } from "../../components/SignOutButton";
import { PreferencePicker } from "../../components/PreferencePicker";
import { getPreferences, getSavedItems } from "../../../db/service";
import { getCurrentUser } from "../../../lib/auth";

export const metadata: Metadata = { title: "My reading desk", description: "Saved stories and reading interests." };

export default async function NewsDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fperspective%2Fdashboard&mode=login");
  const [preferences, saved] = await Promise.all([getPreferences(user.id), getSavedItems(user.id, "news")]);
  return <main className="news-dashboard dashboard-page">
    <SiteHeader portal="news" user={user} />
    <div className="news-dash-edition page-shell"><span>MY PERSPECTIVE</span><span>{new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</span><span>PERSONAL EDITION</span></div>
    <section className="news-dash-lead page-shell"><p>Good morning, {user.name.split(" ")[0]}.</p><h1>Your reading desk,<br /><em>edited by curiosity.</em></h1><div className="news-dash-actions"><Link href="/perspective">Read today’s briefing →</Link><SignOutButton /></div></section>
    <section className="news-dash-grid page-shell">
      <article className="saved-reading"><div className="dashboard-heading"><div><p className="dash-label">SAVED TO D1</p><h2>Your reading list</h2></div><span>{saved.length} item{saved.length === 1 ? "" : "s"}</span></div>{saved.map((item) => { const metadata = JSON.parse(item.metadata) as { lens?: string; demo?: boolean }; return <div className="saved-story" key={item.id}><span>POLICY · 6 MIN</span><h3>{item.title}</h3><p>{metadata.lens ?? "All lenses"}{metadata.demo ? " · Sample saved item" : ""}</p></div>; })}</article>
      <aside className="news-interests"><p className="dash-label">TUNE YOUR EDITION</p><h2>What deserves more context?</h2><p>These choices solve the cold-start problem. They will rank briefings, never hide opposing lenses.</p><PreferencePicker portal="news" options={["India", "Policy", "Science", "Climate", "Business", "Technology", "Culture", "World"]} initial={preferences.newsTopics} /></aside>
    </section>
  </main>;
}
