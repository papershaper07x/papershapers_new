import { billingConfig, reconcilePayment, validSignature } from "../../../../lib/billing";

export async function POST(request: Request) {
  if (!billingConfig().enabled) return new Response("Disabled", { status: 503 });
  if (Number(request.headers.get("content-length")) > 65536) return new Response("Too large", { status: 413 });
  const raw = await request.text();
  if (Buffer.byteLength(raw) > 65536) return new Response("Too large", { status: 413 });
  if (!validSignature(raw, request.headers.get("x-razorpay-signature") || "", process.env.RAZORPAY_WEBHOOK_SECRET!)) return new Response("Invalid signature", { status: 400 });
  let event;
  try { event = JSON.parse(raw); } catch { return new Response("Invalid JSON", { status: 400 }); }
  if (!["payment.captured", "refund.processed"].includes(event.event)) return Response.json({ received: true });
  const id = event.event === "refund.processed" ? event.payload?.refund?.entity?.payment_id : event.payload?.payment?.entity?.id;
  if (typeof id !== "string") return new Response("Missing payment", { status: 400 });
  try { await reconcilePayment(id); return Response.json({ received: true }); }
  catch { return new Response("Reconciliation failed; retry", { status: 503 }); }
}
