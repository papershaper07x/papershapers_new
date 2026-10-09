import assert from "node:assert/strict";
import test from "node:test";
import { readAttemptDraft, remainingSeconds } from "../app/papershapers/attempt-draft";
import { gradeFromSlug, subjectSlug } from "../app/syllabus/catalog";

test("expired deadlines survive reload instead of restarting the timer", () => {
  const draft = readAttemptDraft(JSON.stringify({ answers: { Q1: "x=3" }, deadline: 900, savedAt: 800 }), 1000);
  assert.equal(draft?.deadline, 900);
  assert.equal(remainingSeconds(draft!.deadline, 1000), 0);
  assert.equal(remainingSeconds(10_000, 2000), 8);
});

test("corrupt, oversized and stale browser drafts are rejected", () => {
  for (const raw of ["bad json", JSON.stringify({ answers: [], deadline: 1, savedAt: 1 }), JSON.stringify({ answers: { Q1: 7 }, deadline: 1, savedAt: 1 }), JSON.stringify({ answers: {}, deadline: 1, savedAt: 1 })]) {
    assert.equal(readAttemptDraft(raw, 90_000_000), null);
  }
  assert.equal(readAttemptDraft(JSON.stringify({ answers: { Q1: "x".repeat(8001) }, deadline: 2000, savedAt: 500 }), 1000), null);
});

test("public curriculum slugs accept only supported grade URL shapes", () => {
  assert.equal(gradeFromSlug("class-10"), "10");
  for (const slug of ["class-0", "class-13", "10", "class-[grade]"]) assert.equal(gradeFromSlug(slug), null);
  assert.equal(subjectSlug("Social Science"), "social-science");
});
