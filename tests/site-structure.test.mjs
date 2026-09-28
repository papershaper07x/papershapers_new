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
    assert.match(page, /export default function/);
    assert.match(brief, /## Product boundary/);
  }
});

test("starter preview markers are removed", async () => {
  const page = await readFile(new URL("app/page.tsx", root), "utf8");
  const layout = await readFile(new URL("app/layout.tsx", root), "utf8");
  assert.doesNotMatch(page + layout, /codex-preview|SkeletonPreview/);
});
