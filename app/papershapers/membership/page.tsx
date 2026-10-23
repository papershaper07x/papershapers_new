import { pageMetadata } from "../../../lib/seo";
import type { Metadata } from "next";
import { getCurrentUser } from "../../../lib/auth";
import { billingConfig, membership } from "../../../lib/billing";
import { getDb } from "../../../db";
import { SiteHeader, SiteFooter } from "../../components/SiteChrome";
import Checkout from "./Checkout";

export const metadata: Metadata = pageMetadata('/papershapers/membership', 'Study Plus & contributions', 'Compare free CBSE chapter practice and optional Study Plus limits, queue priority and contributions.');
export const dynamic = "force-dynamic";

export default async function MembershipPage() {
  const config = billingConfig();
  const user = await getCurrentUser();
  let available = config.checkoutEnabled && process.env.REQUEST_LIMITS_ENABLED === "true";
  let current: { expires_at: string } | null = null;
  let history: { id: string; kind: string; amount: number; status: string; created_at: string }[] = [];
  if (config.entitlementsEnabled && user) {
    try {
      current = await membership(user.id);
      history = (await getDb().prepare("SELECT id, kind, amount, status, created_at FROM billing_orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 20").bind(user.id).all<typeof history[number]>()).results;
    } catch { available = false; }
  }
  return <main className="study-information"><SiteHeader portal="study" user={user} /><article className="page-shell billing-page"><p className="kicker">Membership & contributions</p><h1>A little support.<br /><em>More room to practise.</em></h1><p>Free practice stays free. Choose optional priority access or help support the project.</p>{current && <p role="status">Study Plus is active until {new Date(current.expires_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST.</p>}<Checkout enabled={available} signedIn={Boolean(user)} active={Boolean(current)} amount={config.amount} /><p>Secure checkout by Razorpay. Payment method availability and processing fees depend on the provider. The displayed amount is the total charged by this checkout. For refund or payment questions, email <a href="mailto:hello@papershapers.in">hello@papershapers.in</a> with your payment reference.</p>{history.length > 0 && <section><h2>Your recent payments</h2><ul className="billing-history">{history.map((order) => <li key={order.id}><strong>{order.kind === "membership" ? "Study Plus" : "Contribution"} · ₹{order.amount / 100}</strong><span>{order.status} · {new Date(order.created_at).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}</span><small>Reference: {order.id}</small></li>)}</ul></section>}</article><SiteFooter portal="study" /></main>;
}
