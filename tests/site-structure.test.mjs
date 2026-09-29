import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("umbrella home links to every portal", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  for (const route of ["/papershapers", "/perspective", "/noticeboard"]) {
    assert.match(page, new RegExp(`href: \\"${route}\\"`));
  }
});

test("each portal has a route and a maintained brief", async () => {
  for (const portal of ["papershapers", "perspective", "noticeboard"]) {
    const page = await readFile(new URL(`app/${portal}/page.tsx`, root), "utf8");
    const brief = await readFile(new URL(`app/${portal}/README.md`, root), "utf8");
    assert.match(page, /export default (?:async )?function/);
    assert.match(brief, /## Product boundary/);
  }
});

test("starter preview markers are removed", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.doesNotMatch(page + layout, /codex-preview|SkeletonPreview/);
});

test("account and dashboard routes exist for every portal", async () => {
  for (const file of [
    "app/auth/page.tsx",
    "app/api/auth/signup/route.ts",
    "app/api/auth/login/route.ts",
    "app/papershapers/dashboard/page.tsx",
    "app/perspective/dashboard/page.tsx",
    "app/noticeboard/dashboard/page.tsx",
  ]) {
    const source = await readFile(new URL(file, root), "utf8");
    assert.ok(source.length > 100, `${file} should contain an implementation`);
  }
});

test("worker maps product subdomains without redirects", async () => {
  const worker = await readFile(new URL("worker/index.ts", root), "utf8");
  assert.match(worker, /learn: "\/papershapers"/);
  assert.match(worker, /news: "\/perspective"/);
  assert.match(worker, /nearby: "\/noticeboard"/);
  assert.match(worker, /new Request\(url, request\)/);
});

test("database schema covers identity and portal state", async () => {
  const schema = await readFile(new URL("db/schema.ts", root), "utf8");
  for (const table of ["users", "sessions", "study_requests", "user_preferences", "saved_items"]) {
    assert.match(schema, new RegExp(`\\"${table}\\"`));
  }
});

test("each portal has a same-origin backend adapter", async () => {
  const required = [
    "app/api/study/generate/route.ts",
    "app/api/news/articles/route.ts",
    "app/api/news/analyze/route.ts",
    "app/api/marketplace/listings/route.ts",
    "lib/backend.ts",
    "backend/app/main.py",
    "backend/app/llm_router.py",
  ];
  for (const file of required) await readFile(new URL(file, root));
});

test("Study has independent paper, attempt, and formative result routes", async () => {
  for (const file of [
    "app/papershapers/papers/[paperId]/page.tsx",
    "app/papershapers/papers/[paperId]/attempt/page.tsx",
    "app/papershapers/papers/[paperId]/attempts/[attemptId]/page.tsx",
    "app/api/study/papers/[paperId]/route.ts",
    "app/api/study/papers/[paperId]/attempts/route.ts",
    "backend/app/study.py",
  ]) await readFile(new URL(file, root));
});

test("Study includes a curriculum-aware test planner", async () => {
  for (const file of [
    "app/papershapers/tests/new/page.tsx",
    "app/papershapers/test-planner.tsx",
    "app/papershapers/study-catalog.ts",
  ]) await readFile(new URL(file, root));
});
