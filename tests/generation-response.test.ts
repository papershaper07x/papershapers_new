import assert from "node:assert/strict";
import { test } from "node:test";
import { generationResponse } from "../app/papershapers/generation-response";

test("HTML gateway errors produce a useful message instead of JSON parser output", async () => {
  await assert.rejects(generationResponse(new Response("<HTML>Gateway timeout</HTML>", { status: 504 })), /took too long/);
  await assert.rejects(generationResponse(new Response("<HTML>Unavailable</HTML>", { status: 503 })), /couldn’t reach/);
});
test("generation responses preserve valid jobs and actionable JSON errors", async () => {
  assert.deepEqual(await generationResponse(Response.json({ job: { id: "test", status: "queued" } }, { status: 202 })), { job: { id: "test", status: "queued" } });
  await assert.rejects(generationResponse(Response.json({ error: "Sign in to continue." }, { status: 401 })), /Sign in/);
});

import { hasAttemptAnswer } from '../app/papershapers/has-attempt-answer';
test('choosing an OR branch alone does not mark a question answered', () => {
  assert.equal(hasAttemptAnswer(JSON.stringify({selection:'alternative',answer:'',parts:[]})),false);
  assert.equal(hasAttemptAnswer(JSON.stringify({selection:'primary',parts:[JSON.stringify({selection:'alternative',answer:'42'})]})),true);
});
