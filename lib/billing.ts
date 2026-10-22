import { createHmac, timingSafeEqual } from "node:crypto";
import { getDb } from "../db";

export const MEMBERSHIP_DAYS = 30;
export type BillingOrder = { id: string; user_id: string; kind: "membership" | "contribution"; amount: number; currency: string; provider_order_id: string | null; payment_id: string | null; status: string; expires_at: string | null };

export function billingConfig() {
  const amount = Number(process.env.STUDY_MEMBERSHIP_PAISE);
  const entitlementsEnabled = process.env.BILLING_ENABLED === "true";
  const enabled = entitlementsEnabled && Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET && process.env.RAZORPAY_WEBHOOK_SECRET) && Number.isSafeInteger(amount) && amount >= 100 && amount <= 1000000;
  return { enabled, entitlementsEnabled, checkoutEnabled: enabled && process.env.BILLING_CHECKOUT_ENABLED !== "false", amount };
}

export function validSignature(body: string, signature: string, secret: string) {
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;
  return timingSafeEqual(createHmac("sha256", secret).update(body).digest(), Buffer.from(signature, "hex"));
}

export function checkoutAmount(kind: unknown, amount: unknown, membershipAmount: number) {
  if (kind === "membership") return membershipAmount;
  if (kind === "contribution" && Number.isSafeInteger(amount) && Number(amount) >= 10000 && Number(amount) <= 1000000) return Number(amount);
  throw new Error("Choose a contribution between ₹100 and ₹10,000.");
}

export async function razorpay<T>(path: string, body?: object): Promise<T> {
  const response = await fetch(`https://api.razorpay.com/v1/${path}`, {
    method: body ? "POST" : "GET", cache: "no-store", signal: AbortSignal.timeout(15000),
    headers: { Authorization: `Basic ${Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64")}`, "Content-Type": "application/json" },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  if (!response.ok) throw new Error("Payment provider is temporarily unavailable. Please try again.");
  return response.json() as Promise<T>;
}

export async function membership(userId: string) {
  // Pausing sales or rotating gateway keys must not revoke already-paid access.
  if (!billingConfig().entitlementsEnabled) return null;
  return getDb().prepare("SELECT expires_at FROM billing_orders WHERE user_id = ? AND kind = 'membership' AND status = 'paid' AND expires_at > now() ORDER BY expires_at DESC LIMIT 1").bind(userId).first<{ expires_at: string }>();
}

export type ProviderPayment = { id: string; order_id: string; amount: number; currency: string; status: string; captured: boolean; created_at: number; amount_refunded: number };

export function matchesPayment(order: BillingOrder, payment: ProviderPayment) {
  return payment.order_id === order.provider_order_id && payment.amount === order.amount && payment.currency === order.currency && payment.status === "captured" && payment.captured === true && payment.amount_refunded === 0 && Number.isSafeInteger(payment.created_at) && payment.created_at > 0;
}

// Both signed webhooks and authenticated checkout reconciliation use the same
// provider read and conditional update. Browser success never grants access.
export async function reconcilePayment(paymentId: string, ownerId?: string) {
  if (!/^pay_[a-zA-Z0-9]+$/.test(paymentId)) throw new Error("Invalid payment reference.");
  const payment = await razorpay<ProviderPayment>(`payments/${paymentId}`);
  if (payment.id !== paymentId) throw new Error("Provider payment reference mismatch.");
  let order = await getDb().prepare("SELECT * FROM billing_orders WHERE provider_order_id = ?").bind(payment.order_id).first<BillingOrder>();
  if (!order && /^order_[a-zA-Z0-9]+$/.test(payment.order_id)) {
    // Recover the crash window between provider creation and local mapping.
    const remote = await razorpay<{ id: string; receipt: string; amount: number; currency: string }>(`orders/${payment.order_id}`);
    const local = await getDb().prepare("SELECT * FROM billing_orders WHERE id = ?").bind(remote.receipt).first<BillingOrder>();
    if (local && !local.provider_order_id && remote.id === payment.order_id && remote.amount === local.amount && remote.currency === local.currency) {
      await getDb().prepare("UPDATE billing_orders SET provider_order_id = ? WHERE id = ? AND provider_order_id IS NULL").bind(remote.id, local.id).run();
      order = { ...local, provider_order_id: remote.id };
    }
  }
  if (!order || (ownerId && order.user_id !== ownerId)) throw new Error("Payment does not belong to this account.");
  if (payment.amount !== order.amount || payment.currency !== order.currency) throw new Error("Payment amount or currency mismatch.");
  if (payment.amount_refunded > 0) {
    // Conservative: any refund revokes the related grant. Never resurrect it.
    await getDb().prepare("UPDATE billing_orders SET status = 'refunded', payment_id = ? WHERE id = ? AND (payment_id IS NULL OR payment_id = ?)").bind(payment.id, order.id, payment.id).run();
    return "refunded";
  }
  if (!matchesPayment(order, payment)) throw new Error("Payment is awaiting capture or does not match the order.");
  return getDb().transaction(async (db) => {
    // Serialise all grants for one owner, including concurrent confirmations.
    await db.prepare("SELECT id FROM users WHERE id = ? FOR UPDATE").bind(order.user_id).first();
    const fresh = await db.prepare("SELECT status FROM billing_orders WHERE id = ? FOR UPDATE").bind(order.id).first<{ status: string }>();
    if (!fresh || fresh.status !== "pending") return fresh?.status || "pending";
    const previous = await db.prepare("SELECT MAX(expires_at) AS expires_at FROM billing_orders WHERE user_id = ? AND kind = 'membership' AND status = 'paid'").bind(order.user_id).first<{ expires_at: string | null }>();
    const paidAt = new Date();
    const start = Math.max(paidAt.getTime(), previous?.expires_at ? new Date(previous.expires_at).getTime() : 0);
    const expires = order.kind === "membership" ? new Date(start + MEMBERSHIP_DAYS * 86400000).toISOString() : null;
    await db.prepare("UPDATE billing_orders SET status = 'paid', payment_id = ?, paid_at = ?, expires_at = ? WHERE id = ? AND status = 'pending'").bind(payment.id, paidAt.toISOString(), expires, order.id).run();
    return "paid";
  });
}
