import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import { tracedRoute, currentRequestId } from "../lib/observability";
import { backendFetch } from "../lib/backend";
import { summarizeTraces } from "../scripts/summarize-traces.mjs";
import { NextRequest } from "next/server";
import { proxy } from "../proxy";

test("page counts use coarse groups and skip known prefetches", () => {
  const original = console.info;
  const logs: string[] = [];
  console.info = (value) => logs.push(value);
  try {
    proxy(new NextRequest("https://example.test/papershapers/papers/private-paper?email=private@example.test"));
    proxy(new NextRequest("https://example.test/papershapers", { headers: { "next-router-prefetch": "1" } }));
    proxy(new NextRequest("https://example.test/papershapers", { headers: { "sec-purpose": "prefetch;prerender" } }));
    assert.equal(logs.length, 1);
    assert.equal(JSON.parse(logs[0]).operation, "study.papers");
    assert.doesNotMatch(logs[0], /private|example.test/);
  } finally { console.info = original; }
});

test("concurrent requests retain independent IDs and logs omit private request data", async () => {
  const logs: string[] = [];
  const original = console.info;
  console.info = (value) => logs.push(value);
  try {
    const handler = tracedRoute("study.generation", async () => {
      const before = currentRequestId();
      await new Promise((resolve) => setTimeout(resolve, 5));
      assert.equal(currentRequestId(), before);
      return Response.json({ ok: true });
    });
    const responses = await Promise.all([1, 2].map(() => handler(new Request("https://example.test/api/study/generate?email=private@example.test", { method: "POST", headers: { "X-Request-ID": "attacker-controlled", Authorization: "private-secret" }, body: "private student answer" }))));
    assert.notEqual(responses[0].headers.get("X-Request-ID"), responses[1].headers.get("X-Request-ID"));
    assert.equal(logs.length, 2);
    assert.doesNotMatch(logs.join(""), /private|attacker|example.test/);
    assert.equal(currentRequestId(), undefined);
  } finally { console.info = original; }
});

test("request ID crosses the backend boundary and unexpected exceptions stay private", async () => {
  const originalFetch = globalThis.fetch;
  const originalLog = console.info;
  const logs: string[] = [];
  console.info = (value) => logs.push(value);
  let forwarded: string | null = null;
  globalThis.fetch = async (_url, init) => {
    forwarded = new Headers(init?.headers).get("X-Request-ID");
    return Response.json({ ok: true });
  };
  try {
    const handler = tracedRoute("study.assessment", async () => {
      await backendFetch("/v1/study/papers/private-id?user_id=private-user", { method: "POST", body: "private answer" });
      throw new Error("private-secret");
    });
    const response = await handler(new Request("https://example.test"));
    assert.equal(response.status, 500);
    assert.equal(response.headers.get("X-Request-ID"), forwarded);
    assert.ok(logs.every((line) => JSON.parse(line).requestId === forwarded));
    assert.doesNotMatch(logs.join("") + await response.text(), /private-secret|private-user|private answer|private-id/);
  } finally { globalThis.fetch = originalFetch; console.info = originalLog; }
});

test("export summary groups events, filters a trace and leaves unknown token counts null", async () => {
  const lines = ["not a log", JSON.stringify({ schema: 1, service: "web", event: "http.request", operation: "study.generation", status: 429, durationMs: 5, requestId: "a" }), JSON.stringify({ schema: 1, service: "web", event: "http.request", operation: "study.generation", status: 202, durationMs: 15, requestId: "b" })];
  const summary = await summarizeTraces(Readable.from(lines.join("\n")));
  assert.equal(summary[0].count, 2);
  assert.equal(summary[0].errors, 1);
  assert.equal(summary[0].durationMean, 10);
  assert.equal(summary[0].totalTokens, null);
  assert.equal((await summarizeTraces(Readable.from(lines.join("\n")), "a"))[0].count, 1);
});
