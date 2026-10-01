import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "../../components/SiteChrome";
import { SignOutButton } from "../../components/SignOutButton";
import { getStudyRequests } from "../../../db/service";
import { getCurrentUser } from "../../../lib/auth";
import { StudyPaperLibrary } from "../study-paper-library";

export const metadata: Metadata = { title: "My study desk", description: "Practice briefs, progress, and study history." };

export default async function StudyDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/auth?next=%2Fpapershapers%2Fdashboard&mode=login");
  const requests = await getStudyRequests(user.id);
  return <main className="study-dashboard dashboard-page">
    <SiteHeader portal="study" user={user} />
    <section className="study-dash-hero page-shell"><div><p className="dash-overline">PRIVATE STUDY DESK · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short" }).toUpperCase()}</p><h1>Good to see you,<br />{user.name.split(" ")[0]}.</h1><p>Your briefs, future generated papers, answer keys, and revision signals live here—not in a disappearing chat.</p><div className="study-dash-hero__actions"><SignOutButton /></div></div><div className="study-score"><span>THIS WEEK</span><strong>{Math.max(1, requests.filter((item) => !item.is_demo).length)}</strong><small>practice brief{requests.length === 1 ? "" : "s"} shaped</small></div></section>
    <section className="study-dash-grid page-shell">
      <article className="dash-primary"><span className="dash-label">NEXT SESSION</span><h2>Build a focused<br />mock paper.</h2><p>Choose Class 9–12, stream, subject, textbook chapters, and paper length before generation begins.</p><Link href="/papershapers/tests/new">Create a curriculum test →</Link></article>
      <article className="study-plan"><span className="dash-label">REVISION RHYTHM</span><h3>Mathematics · Class 10</h3><div><span>Quadratics</span><b>Needs a revisit</b></div><div><span>Real numbers</span><b>Steady</b></div><div><span>Trigonometry</span><b>Next up</b></div><small>Illustrative plan until scored papers are connected.</small></article>
      <article className="study-streak"><span>7</span><p>day rhythm</p><small>Cold-start example</small></article>
    </section>
    <section className="history-section page-shell"><StudyPaperLibrary /><div className="dashboard-heading study-request-heading"><div><p className="dash-label">REQUEST HISTORY</p><h2>Recent paper briefs</h2></div><SignOutButton /></div><div className="history-table"><div className="history-row history-head"><span>Subject</span><span>Class</span><span>Intent</span><span>Status</span><span>Paper</span><span>Date</span></div>{requests.map((item) => <div className="history-row" key={item.id}>{item.paper_id ? <Link className="history-paper-link" href={`/papershapers/papers/${item.paper_id}`}>{item.subject}{item.is_demo ? <small> SAMPLE</small> : null}</Link> : <strong>{item.subject}{item.is_demo ? <small> SAMPLE</small> : null}</strong>}<span>{item.grade}</span><span>{item.focus}</span><span>{item.status}</span>{item.paper_id ? <Link className="history-paper-link" href={`/papershapers/papers/${item.paper_id}`}>Open paper →</Link> : <span>—</span>}<span>{new Date(item.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span></div>)}</div></section>
  </main>;
}
