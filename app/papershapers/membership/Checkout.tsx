"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Result = { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string };
type CheckoutInstance = { open(): void; on(event: string, callback: () => void): void };
declare global { interface Window { Razorpay?: new (options: Record<string, unknown>) => CheckoutInstance } }

let loading: Promise<void> | undefined;
function loadCheckout() {
  if (window.Razorpay) return Promise.resolve();
  return loading ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { loading = undefined; script.remove(); reject(new Error("Could not load secure checkout.")); };
    document.head.appendChild(script);
  });
}

export default function Checkout({ enabled, signedIn, active, amount }: { enabled: boolean; signedIn: boolean; active: boolean; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [contribution, setContribution] = useState(100);
  const [message, setMessage] = useState("");
  async function pay(kind: "membership" | "contribution") {
    setBusy(true); setMessage("");
    try {
      await loadCheckout();
      const response = await fetch("/api/billing/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, amount: contribution * 100, accepted }) });
      const order = await response.json();
      if (!response.ok) throw new Error(order.error);
      const checkout = new window.Razorpay!({ key: order.key, order_id: order.orderId, amount: order.amount, currency: order.currency, name: "Paper Shapers", description: kind === "membership" ? "Study Plus · 30 days, no automatic renewal" : "Voluntary contribution", modal: { ondismiss: () => { setBusy(false); setMessage("Checkout closed. Any captured payment will still be confirmed automatically."); } }, handler: async (result: Result) => {
        try {
          const verified = await fetch("/api/billing/verify", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(result) });
          const data = await verified.json();
          if (!verified.ok) throw new Error(data.error);
          setMessage(data.status === "paid" ? "Payment confirmed. Thank you!" : "This payment has been refunded.");
          router.refresh();
        } catch (error) { setMessage(error instanceof Error ? error.message : "Confirmation is pending. Please refresh later."); }
        finally { setBusy(false); }
      } });
      checkout.on("payment.failed", () => { setMessage("Payment failed. Try again or choose another method."); setBusy(false); });
      checkout.open();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Checkout is unavailable."); setBusy(false); }
  }
  const disabled = !enabled || !signedIn || !accepted || busy;
  return <>
    <label className="billing-consent"><input type="checkbox" checked={accepted} onChange={(event) => setAccepted(event.target.checked)} /> I am 18 or older, or an authorised parent/guardian paying for this account, and accept the <a href="/terms">payment terms</a>.</label>
    <div className="billing-grid">
      <section className="billing-option"><p className="kicker">Study Plus</p><h2>Less waiting.<br />Same thoughtful practice.</h2><p className={enabled ? "billing-price" : ""}>{enabled ? `₹${amount / 100}` : "Payments coming soon"}{enabled && <small> / 30 days</small>}</p><p>Priority when the generation queue is busy. Free accounts retain the same practice features. With usage controls enabled, Free allows 3 generation requests per 10-minute window; Study Plus allows 6. Requests count even if generation fails. All accounts also have a shared safety allowance of 5 AI requests per day across generation and AI feedback, resetting at 00:00 UTC (05:30 India time); failed requests count. Site-wide safety limits can pause AI for everyone. Membership does not bypass these limits. AI execution times and provider availability still vary.</p><p>One payment. No automatic renewal. Renew when your membership expires.</p><button className="nav-pill" disabled={disabled || active} onClick={() => pay("membership")}>{busy ? "Please wait…" : active ? "Membership active" : "Get Study Plus"}</button></section>
      <section className="billing-option" id="contribute"><p className="kicker">Buy us a coffee</p><h2>Help keep useful<br />ideas growing.</h2><p>A voluntary contribution supports Paper Shapers. It does not unlock paid access and is not a charitable or tax-deductible donation.</p><label htmlFor="contribution">Contribution in rupees (₹100–₹10,000)</label><input id="contribution" type="number" min="100" max="10000" step="1" value={contribution} onChange={(event) => setContribution(Number(event.target.value))} /><button className="nav-pill" disabled={disabled || !Number.isInteger(contribution) || contribution < 100 || contribution > 10000} onClick={() => pay("contribution")}>Contribute ₹{contribution || 0}</button></section>
    </div>
    {!enabled && <p role="status">New payments are currently unavailable. Please check back later or contact support.</p>}
    {!signedIn && <p><a href="/auth?next=%2Fpapershapers%2Fmembership">Sign in</a> to manage your membership or contribution receipts.</p>}
    <p role="status" aria-live="polite">{message}</p>
  </>;
}
