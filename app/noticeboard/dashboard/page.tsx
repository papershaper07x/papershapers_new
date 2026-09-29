import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../components/SiteChrome";
import { SignOutButton } from "../../components/SignOutButton";
import { PreferencePicker } from "../../components/PreferencePicker";
import { getPreferences, getSavedItems } from "../../../db/service";
import { getCurrentUser } from "../../../lib/auth";

export const metadata: Metadata = { title: "My nearby dashboard", description: "Saved local finds and neighbourhood interests." };

export default async function MarketplaceDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fnoticeboard%2Fdashboard&mode=login");
  const [preferences, saved] = await Promise.all([getPreferences(user.id), getSavedItems(user.id, "marketplace")]);
  return <main className="market-dashboard dashboard-page">
    <SiteHeader portal="marketplace" user={user} />
    <section className="market-dash-hero"><div className="page-shell"><p className="dash-overline">⌖ {preferences.marketplaceArea.toUpperCase()} · YOUR LOCAL DESK</p><h1>Hey {user.name.split(" ")[0]},<br />what are we finding today?</h1><div><Link href="/noticeboard">Explore what’s fresh →</Link><SignOutButton /></div></div></section>
    <section className="market-dash-body page-shell">
      <aside className="market-profile"><p className="dash-label">YOUR NEIGHBOURHOOD SIGNAL</p><h2>Make nearby<br />feel personal.</h2><p>Choose an area and a few interests. Until behaviour exists, these explicit choices are the honest cold-start signal.</p><PreferencePicker portal="marketplace" options={["Food", "Offers", "Events", "Services", "Classes", "Community", "Home", "Kids"]} initial={preferences.marketplaceInterests} area={preferences.marketplaceArea} /></aside>
      <div className="market-saved"><div className="dashboard-heading"><div><p className="dash-label">YOUR SHORTLIST</p><h2>Saved nearby</h2></div><span>{saved.length} saved</span></div><div className="market-saved-grid">{saved.map((item, index) => { const metadata = JSON.parse(item.metadata) as { area?: string; category?: string; demo?: boolean }; return <article className={`market-ticket market-ticket--${index % 3}`} key={item.id}><span>{metadata.category ?? "LOCAL FIND"}</span><h3>{item.title}</h3><p>⌖ {metadata.area ?? preferences.marketplaceArea}</p>{metadata.demo && <small>SAMPLE ITEM</small>}</article>; })}</div></div>
    </section>
  </main>;
}
