import { billingConfig } from "../../lib/billing";
import { STUDY_PLANS } from "../../lib/study-plans";
import { DAILY_AI_ALLOWANCE } from "../../lib/study-quota";

export function StudyPlans() {
  const config = billingConfig();
  const limits = process.env.REQUEST_LIMITS_ENABLED === "true";
  return <section className="study-plans page-shell" id="plans" aria-labelledby="plans-heading">
    <div className="section-heading"><p className="kicker">Free practice · optional support</p><h2 id="plans-heading">Start free. Make room for more.</h2><p>Choose the pace that suits you. Study Plus supports the project and moves your requests ahead of recent free requests when the AI queue is busy.</p></div>
    <div className="study-plans__grid">
      <article><p className="kicker">Free</p><h3>Your first study habit.</h3><p className="billing-price">₹0</p><p>Chapter-based papers, online attempts and formative feedback in the standard queue.</p><p>{limits ? `Up to ${STUDY_PLANS.free} generation requests per 10-minute window.` : "Additional 10-minute burst limits are not currently enabled."}</p><a className="text-link" href="/papershapers/tests/new">Start free practice →</a></article>
      <article><p className="kicker">Study Plus</p><h3>More practice. Less waiting.</h3><p className="billing-price">{config.checkoutEnabled && limits ? `₹${config.amount / 100} / 30 days` : "Payments coming soon"}</p><p>The same study features, with priority in the generation queue.</p><p>{limits ? `Up to ${STUDY_PLANS.plus} generation requests per 10-minute window.` : "A higher burst allowance becomes available when short-window controls are enabled."} One payment for 30 days. No automatic renewal.</p><a className="text-link" href="/papershapers/membership">Explore Study Plus →</a></article>
    </div>
    <p>Optional burst limits count generation requests, including unsuccessful requests, and reset in fixed 10-minute windows. AI availability and completion times vary. Older free requests receive queue protection.</p>
    <p>All accounts have {DAILY_AI_ALLOWANCE} daily AI slots shared by completed papers, completed feedback, and requests still running. Failed requests do not count. It resets at 00:00 UTC (05:30 India time). Site-wide AI provider allowances also apply. Saved papers and results remain available without using another slot.</p>
    <p>Prefer to support without upgrading? <a className="text-link" href="/papershapers/membership#contribute">Make a voluntary contribution →</a> Contributions do not unlock Study Plus.</p>
  </section>;
}
