import { userFromRequest } from "../../../../lib/auth";
import { billingConfig, reconcilePayment, validSignature } from "../../../../lib/billing";
import { withinRequestLimit, rateLimitResponse } from "../../../../lib/request-limit";

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin." }, { status: 403 });
  if (!billingConfig().enabled) return Response.json({ error: "Payments are disabled." }, { status: 503 });
  const user = await userFromRequest(request);
  if (!user) return Response.json({ error: "Sign in to verify your payment." }, { status: 401 });
  if (!await withinRequestLimit("billing-verify", user.id, 20, 600)) return rateLimitResponse(600);
  const body = await request.json().catch(() => null);
  if (!body || typeof body.razorpay_order_id !== "string" || typeof body.razorpay_payment_id !== "string" || typeof body.razorpay_signature !== "string" || !validSignature(`${body.razorpay_order_id}|${body.razorpay_payment_id}`, body.razorpay_signature, process.env.RAZORPAY_KEY_SECRET!)) return Response.json({ error: "Invalid payment signature." }, { status: 400 });
  try { return Response.json({ status: await reconcilePayment(body.razorpay_payment_id, user.id) }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Payment is awaiting confirmation. Your account will update after provider confirmation; contact us if it does not." }, { status: 409 }); }
}
