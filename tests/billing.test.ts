import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { billingConfig, checkoutAmount, matchesPayment, reconcilePayment, validSignature, type BillingOrder, type ProviderPayment } from "../lib/billing";
import { getDb } from "../db";

const order: BillingOrder = { id: "local", user_id: "owner", kind: "membership", amount: 19900, currency: "INR", provider_order_id: "order_123", payment_id: null, status: "pending", expires_at: null };
const payment: ProviderPayment = { id: "pay_123", order_id: "order_123", amount: 19900, currency: "INR", status: "captured", captured: true, created_at: 1700000000, amount_refunded: 0 };

test("raw-body signatures reject mutation, wrong secrets and malformed signatures", () => {
  const raw = '{"event":"payment.captured"}';
  const signature = createHmac("sha256", "test-secret").update(raw).digest("hex");
  assert.equal(validSignature(raw, signature, "test-secret"), true);
  assert.equal(validSignature(raw + " ", signature, "test-secret"), false);
  assert.equal(validSignature(raw, signature, "wrong"), false);
  for (const invalid of ["", "abc", "g".repeat(64), signature + "0"]) assert.equal(validSignature(raw, invalid, "test-secret"), false);
});

test("server owns membership pricing and contributions have bounded integer amounts", () => {
  assert.equal(checkoutAmount("membership", 1, 19900), 19900);
  assert.equal(checkoutAmount("contribution", 10000, 19900), 10000);
  for (const amount of [0, -100, 9999, 1000001, 10000.5, "10000", NaN]) assert.throws(() => checkoutAmount("contribution", amount, 19900));
  assert.throws(() => checkoutAmount("other", 10000, 19900));
});

test("only matching captured and unrefunded payments qualify", () => {
  assert.equal(matchesPayment(order, payment), true);
  for (const mismatch of [{ amount: 1 }, { currency: "USD" }, { order_id: "order_other" }, { status: "authorized" }, { captured: false }, { amount_refunded: 1 }, { created_at: NaN }]) assert.equal(matchesPayment(order, { ...payment, ...mismatch }), false);
});

test("billing defaults off without complete configuration", () => {
  const saved = process.env.BILLING_ENABLED;
  process.env.BILLING_ENABLED = "false";
  assert.equal(billingConfig().enabled, false);
  if (saved === undefined) delete process.env.BILLING_ENABLED; else process.env.BILLING_ENABLED = saved;
});

test("sales pause keeps entitlements enabled while rejecting new checkout", () => {
  const names = ["BILLING_ENABLED", "BILLING_CHECKOUT_ENABLED", "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET", "STUDY_MEMBERSHIP_PAISE"];
  const saved = names.map((name) => process.env[name]);
  try {
    process.env.BILLING_ENABLED = "true";
    process.env.BILLING_CHECKOUT_ENABLED = "false";
    process.env.RAZORPAY_KEY_ID = "test";
    process.env.RAZORPAY_KEY_SECRET = "test";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test";
    process.env.STUDY_MEMBERSHIP_PAISE = "19900";
    assert.equal(billingConfig().enabled, true);
    assert.equal(billingConfig().entitlementsEnabled, true);
    assert.equal(billingConfig().checkoutEnabled, false);
    delete process.env.RAZORPAY_KEY_SECRET;
    assert.equal(billingConfig().enabled, false);
    assert.equal(billingConfig().entitlementsEnabled, true);
  } finally { names.forEach((name, index) => { if (saved[index] === undefined) delete process.env[name]; else process.env[name] = saved[index]; }); }
});

test("reconciliation is owner scoped, replay safe, refund terminal, and donations grant no membership", async () => {
  process.env.DATABASE_URL ||= "postgres://unused:unused@localhost/unused";
  const db = getDb();
  const originalPrepare = db.prepare;
  const originalTransaction = db.transaction;
  const originalFetch = globalThis.fetch;
  let stored = { ...order };
  let provider = { ...payment };
  let writes = 0;
  // Exercise production reconciliation with a tiny stateful storage adapter;
  // no provider account or live database is contacted by this test.
  db.prepare = ((query: string) => {
    let values: unknown[] = [];
    return { bind(...input: unknown[]) { values = input; return this; }, async first() {
      if (query.includes("MAX(expires_at)")) return { expires_at: null };
      if (query.includes("SELECT status")) return { status: stored.status };
      return { ...stored };
    }, async run() {
      if (query.includes("status = 'refunded'")) { stored.status = "refunded"; stored.payment_id = String(values[0]); }
      else if (query.includes("status = 'paid'") && stored.status === "pending") { writes++; stored.status = "paid"; stored.payment_id = String(values[0]); stored.expires_at = values[2] as string | null; }
    } };
  }) as unknown as typeof db.prepare;
  db.transaction = (async (operation: (transaction: typeof db) => Promise<unknown>) => operation(db)) as typeof db.transaction;
  globalThis.fetch = async () => Response.json(provider);
  try {
    await assert.rejects(reconcilePayment(payment.id, "intruder"), /belong/);
    assert.equal(writes, 0);
    provider.status = "authorized";
    await assert.rejects(reconcilePayment(payment.id, "owner"), /capture/);
    provider = { ...payment };
    assert.equal(await reconcilePayment(payment.id, "owner"), "paid");
    assert.ok(stored.expires_at);
    const expiry = stored.expires_at;
    assert.equal(await reconcilePayment(payment.id, "owner"), "paid");
    assert.equal(writes, 1);
    assert.equal(stored.expires_at, expiry);
    provider.amount_refunded = 100;
    assert.equal(await reconcilePayment(payment.id), "refunded");
    provider.amount_refunded = 0;
    assert.equal(await reconcilePayment(payment.id), "refunded");
    stored = { ...order, kind: "contribution" };
    assert.equal(await reconcilePayment(payment.id, "owner"), "paid");
    assert.equal(stored.expires_at, null);
  } finally { db.prepare = originalPrepare; db.transaction = originalTransaction; globalThis.fetch = originalFetch; }
});

// The public plan contract also controls the authenticated generation endpoint.
import { generationAllowance, STUDY_PLANS } from "../lib/study-plans";
test("only active paid access receives the higher generation allowance", () => {
  assert.equal(generationAllowance(false), 3);
  assert.equal(generationAllowance(true), 6);
  assert.equal(STUDY_PLANS.windowSeconds, 600);
});
