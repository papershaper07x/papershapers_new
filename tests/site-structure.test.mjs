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

test("Netlify explicitly enables the Next.js runtime", async () => {
  const config = await readFile(new URL("netlify.toml", root), "utf8");
  assert.match(config, /command = "npm run build"/);
  assert.match(config, /publish = "\.next"/);
  assert.match(config, /package = "@netlify\/plugin-nextjs"/);
});

test("database schema covers identity and portal state", async () => {
  const schema = await readFile(new URL("database/migrations/0001_initial.sql", root), "utf8");
  for (const table of ["users", "sessions", "auth_identities", "study_requests", "user_preferences", "saved_items"]) {
    assert.match(schema, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
});

test("Google sign-in keeps credentials server-side and protects the callback", async () => {
  for (const file of [
    "app/api/auth/google/start/route.ts",
    "app/api/auth/google/callback/route.ts",
    "lib/google-oauth.ts",
  ]) await readFile(new URL(file, root));
  const oauth = await readFile(new URL("lib/google-oauth.ts", root), "utf8");
  assert.match(oauth, /GOOGLE_CLIENT_SECRET/);
  assert.match(oauth, /matchesOAuthState/);
  assert.doesNotMatch(oauth, /NEXT_PUBLIC_GOOGLE_CLIENT_SECRET/);
});

test("legal and launch-readiness pages are maintained", async () => {
  for (const file of [
    "app/privacy/page.tsx",
    "app/terms/page.tsx",
    "app/cookies/page.tsx",
    "docs/LAUNCH_READINESS.md",
  ]) await readFile(new URL(file, root));
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

test("Study retains a linked, paginated paper archive", async () => {
  const [archive, dashboard, paperApi, schema] = await Promise.all([
    readFile(new URL("app/papershapers/papers/page.tsx", root), "utf8"),
    readFile(new URL("app/papershapers/dashboard/page.tsx", root), "utf8"),
    readFile(new URL("app/api/study/papers/route.ts", root), "utf8"),
    readFile(new URL("database/migrations/0001_initial.sql", root), "utf8"),
  ]);
  assert.match(archive, /PaperArchive/);
  assert.match(dashboard, /paper_id/);
  assert.match(paperApi, /offset/);
  assert.match(schema, /paper_id/);
});

test("Study paper content has browser and backend access boundaries", async () => {
  const [generator, paperRoute, backend] = await Promise.all([
    readFile(new URL("app/api/study/generate/route.ts", root), "utf8"),
    readFile(new URL("app/api/study/papers/[paperId]/route.ts", root), "utf8"),
    readFile(new URL("backend/app/main.py", root), "utf8"),
  ]);
  assert.match(generator, /Sign in is required to generate a paper/);
  assert.match(paperRoute, /Sign in is required to view this paper/);
  assert.match(backend, /Backend write authentication is not configured/);
  assert.match(backend, /X-Backend-Secret/);
});

test("Study includes a curriculum-aware test planner", async () => {
  for (const file of [
    "app/papershapers/tests/new/page.tsx",
    "app/papershapers/test-planner.tsx",
    "app/papershapers/study-catalog.ts",
  ]) await readFile(new URL(file, root));
});

test("Study Journal separates moderated submissions from public reading", async () => {
  for (const file of [
    "app/papershapers/journal/page.tsx",
    "app/papershapers/journal/new/page.tsx",
    "app/papershapers/journal/[slug]/page.tsx",
    "app/api/community/posts/route.ts",
  ]) await readFile(new URL(file, root));
  const schema = await readFile(new URL("database/migrations/0001_initial.sql", root), "utf8");
  const service = await readFile(new URL("db/service.ts", root), "utf8");
  assert.match(schema, /community_posts/);
  assert.match(service, /status = 'published'/);
  assert.match(service, /'pending'/);
});

test("Study includes teacher live room hosting and student test attempt flow", async () => {
  for (const file of [
    "app/papershapers/for-teachers/rooms/page.tsx",
    "app/papershapers/for-teachers/rooms/[roomId]/page.tsx",
    "app/papershapers/room/page.tsx",
    "app/papershapers/room/[roomId]/page.tsx",
    "app/papershapers/room/[roomId]/live-room-attempt.tsx",
  ]) await readFile(new URL(file, root));
  const schema = await readFile(new URL("database/migrations/0001_initial.sql", root), "utf8");
  const service = await readFile(new URL("db/service.ts", root), "utf8");
  assert.match(schema, /test_rooms/);
  assert.match(schema, /test_attendees/);
  assert.match(service, /createTestRoom/);
  assert.match(service, /joinTestRoom/);
  assert.match(service, /submitTestAttempt/);
});
