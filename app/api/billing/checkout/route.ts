import { randomUUID } from "node:crypto";
import { userFromRequest } from "../../../../lib/auth";
import { billingConfig, checkoutAmount, membership, razorpay } from "../../../../lib/billing";
import { getDb } from "../../../../db";
import { withinRequestLimit, rateLimitResponse } from "../../../../lib/request-limit";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  const config = billingConfig();
  if (!config.checkoutEnabled || process.env.REQUEST_LIMITS_ENABLED !== "true") return Response.json({ error: "Payments are not configured yet or checkout is paused." }, { status: 503 });
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in before paying." }, { status: 401 });
  if (!await withinRequestLimit("billing-checkout", user.id, 5, 600)) return rateLimitResponse(600);
  const body = await request.json().catch(() => null);
  if (!body || !["membership", "contribution"].includes(body.kind) || body.accepted !== true) return Response.json({ error: "Accept the payment terms and choose a payment type." }, { status: 400 });
  let amount: number;
  try { amount = checkoutAmount(body.kind, body.amount, config.amount); }
  catch (error) { return Response.json({ error: (error as Error).message }, { status: 400 }); }
  try {
    if (body.kind === "membership" && await membership(user.id)) return Response.json({ error: "Your membership is active. Renew after it expires." }, { status: 409 });
    const providerId = await getDb().transaction(async (db) => {
      await db.prepare("SELECT id FROM users WHERE id = ? FOR NO KEY UPDATE").bind(user.id).first();
      // Reuse an unpaid order to avoid duplicate subscriptions after a double tap.
      const existing = await db.prepare("SELECT provider_order_id FROM billing_orders WHERE user_id = ? AND kind = ? AND amount = ? AND status = 'pending' AND provider_order_id IS NOT NULL AND created_at > now() - interval '1 day' ORDER BY created_at DESC LIMIT 1").bind(user.id, body.kind, amount).first<{ provider_order_id: string }>();
      let providerId = existing?.provider_order_id;
      if (!providerId) {
        const id = randomUUID();
        await getDb().prepare("INSERT INTO billing_orders(id, user_id, kind, amount) VALUES (?, ?, ?, ?)").bind(id, user.id, body.kind, amount).run();
        const order = await razorpay<{ id: string }>("orders", { amount, currency: "INR", receipt: id });
        await db.prepare("UPDATE billing_orders SET provider_order_id = ? WHERE id = ?").bind(order.id, id).run();
        providerId = order.id;
      }
      return providerId;
    });
    return Response.json({ key: process.env.RAZORPAY_KEY_ID, orderId: providerId, amount, currency: "INR" }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Checkout is temporarily unavailable. No access has been changed." }, { status: 503 }); }
}
