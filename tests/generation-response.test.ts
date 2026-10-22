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

test("support errors include only valid server request references", async () => {
  const id = "ecf42b8e-906b-4d01-b050-e5c982489adc";
  await assert.rejects(generationResponse(Response.json({ error: "Unavailable." }, { status: 503, headers: { "X-Request-ID": id } })), new RegExp(id));
  await assert.rejects(generationResponse(Response.json({ error: "Unavailable." }, { status: 503, headers: { "X-Request-ID": "private@example.test" } })), (error: Error) => !error.message.includes("private"));
});

import { hasAttemptAnswer } from '../app/papershapers/has-attempt-answer';
test('choosing an OR branch alone does not mark a question answered', () => {
  assert.equal(hasAttemptAnswer(JSON.stringify({selection:'alternative',answer:'',parts:[]})),false);
  assert.equal(hasAttemptAnswer(JSON.stringify({selection:'primary',parts:[JSON.stringify({selection:'alternative',answer:'42'})]})),true);
});
