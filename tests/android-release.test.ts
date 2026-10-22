import test from "node:test";
import assert from "node:assert/strict";
import { validateAndroidRelease } from "../scripts/validate-android-release.mjs";
import { GET } from "../app/download/android/route";

test("downloaded APK matches version metadata, checksum and signing block", async () => {
  const release = await validateAndroidRelease();
  assert.equal(release.minimumAndroid, "8.0");
  assert.equal(release.architecture, "browser-custom-tab");
  assert.ok(release.bytes > 0 && release.bytes < 1000000);
});

test("stable download redirects locally to the versioned APK without caching", () => {
  const response = GET(new Request("https://papershapers.in/download/android"));
  assert.equal(response.status, 302);
  assert.match(response.headers.get("location") || "", /^https:\/\/papershapers\.in\/downloads\/papershapers-study-\d+\.\d+\.\d+\.apk$/);
  assert.equal(response.headers.get("cache-control"), "no-store");
});
