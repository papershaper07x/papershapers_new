import assert from "node:assert/strict";
import test from "node:test";
import { dailyStudyQuota } from "../lib/study-quota";

test("daily AI admission always requires server enforcement, independent of optional burst limits", async () => {
  const response = await dailyStudyQuota("account-owner", async (...args) => {
    assert.deepEqual(args, ["study-ai-daily", "account-owner", 5, 86400, true]);
    return true;
  });
  assert.equal(response, null);
});

test("exhaustion returns a retry delay and reset time without a payment upsell", async () => {
  const response = await dailyStudyQuota("account-owner", async () => false);
  assert.equal(response?.status, 429);
  const seconds = Number(response?.headers.get("Retry-After"));
  assert.ok(seconds > 0 && seconds <= 86400);
  const body = await response!.json();
  assert.equal(new Date(body.resetsAt).getUTCHours(), 0);
  assert.equal(new Date(body.resetsAt).getUTCMinutes(), 0);
  assert.match(body.error, /generation and AI feedback share/);
  assert.equal(body.membershipUrl, undefined);
});

test("usage store failure blocks AI instead of spending unmetered", async () => {
  const response = await dailyStudyQuota("account-owner", async () => { throw new Error("private database diagnostic"); });
  assert.equal(response?.status, 503);
  assert.doesNotMatch(await response!.text(), /private database diagnostic/);
});
