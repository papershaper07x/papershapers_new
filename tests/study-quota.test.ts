import assert from "node:assert/strict";
import test from "node:test";
import { backendFetch, BackendResponseError, BackendUnavailableError } from "../lib/backend";

test("backend quota errors preserve the reset delay and actionable message", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => Response.json({ detail: "Completed work and active jobs fill your allowance. Failed requests do not count." }, { status: 429, headers: { "Retry-After": "1800" } });
  try {
    await assert.rejects(() => backendFetch('/v1/study/generation-jobs'), (error: unknown) => {
      assert.ok(error instanceof BackendResponseError);
      assert.equal(error.status, 429);
      assert.equal(error.retryAfter, "1800");
      assert.match(error.message, /Failed requests do not count/);
      return true;
    });
  } finally { globalThis.fetch = original; }
});

test("backend failure remains unavailable instead of becoming an account-limit error", async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async () => { throw new Error('private transport details'); };
  try {
    await assert.rejects(() => backendFetch('/v1/study/generation-jobs'), (error: unknown) => {
      assert.ok(error instanceof BackendUnavailableError);
      assert.doesNotMatch(error.message, /private transport details|daily|allowance/);
      return true;
    });
  } finally { globalThis.fetch = original; }
});
