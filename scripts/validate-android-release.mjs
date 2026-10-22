import fs from "node:fs/promises";
import { createHash } from "node:crypto";

export async function validateAndroidRelease() {
  const directory = new URL("../public/downloads/", import.meta.url);
  const release = JSON.parse(await fs.readFile(new URL("android-release.json", directory), "utf8"));
  if (!/^papershapers-study-\d+\.\d+\.\d+\.apk$/.test(release.filename) || !Number.isSafeInteger(release.versionCode) || release.versionCode < 1 || release.package !== "in.papershapers.study" || !/^[a-f0-9]{64}$/.test(release.signerSha256)) throw new Error("Invalid Android release metadata.");
  const apk = await fs.readFile(new URL(release.filename, directory));
  if (apk.length !== release.bytes || createHash("sha256").update(apk).digest("hex") !== release.sha256) throw new Error("Android APK size/checksum mismatch. Rebuild the release before deploying.");
  if (!apk.includes(Buffer.from("APK Sig Block 42"))) throw new Error("Android APK lacks the expected modern signing block.");
  const manifest = await fs.readFile(new URL("../mobile/android/AndroidManifest.xml", import.meta.url), "utf8");
  if (!manifest.includes(`android:versionName="${release.version}"`) || !manifest.includes(`android:versionCode="${release.versionCode}"`)) throw new Error("Android source and downloadable release versions differ.");
  return release;
}
