# Paper Shapers Android launcher

This is a release-signed Android APK, built with Java and the existing Android
SDK. It has **no runtime permissions, WebView, native JavaScript bridge, embedded
API client or third-party library**. It launches the hosted Study dashboard in a
browser Custom Tab, or a normal browser tab where Custom Tabs are unsupported.
The native screen is a retry/update landing page, not a separate implementation
of the Study interface. Browser setup must be completed by the device owner.

## Release and download

- Package: `in.papershapers.study`; minimum Android 8.0; target SDK 36.
- APK: `public/downloads/papershapers-study-1.0.0.apk`.
- Stable link after deploying the web app: `https://papershapers.in/download/android`.
- Versioned binary: `https://papershapers.in/downloads/papershapers-study-1.0.0.apk`.
- Install/update instructions: `/papershapers/mobile`.
- Metadata: `public/downloads/android-release.json`, including file and signer
  certificate SHA-256. Prebuild rejects a mismatched file/hash/version.

The public URL is **not published by the local build**. The operator chose to
deploy it through the existing Vercel pipeline. Commit/deploy the APK and
metadata together with the source, then test the public redirect and checksum.
The binary is only around 17 KB; downloads still count toward hosting quotas.

## Build on Windows

Requirements: JDK 17+, PowerShell, Android SDK platform 36 and build-tools 36.0.0.
Set `ANDROID_HOME` or pass `-SdkRoot`. No Gradle/AndroidX/npm dependency download
is needed. The build uses `aapt2`, `javac`, `d8`, `zipalign` and `apksigner`.

```powershell
# First release key creation only, before distributing any APK:
powershell -NoProfile -ExecutionPolicy Bypass -File mobile/android/build.ps1 -InitializeSigningKey

# Future releases: increment manifest versionCode and versionName first.
npm run android:build
```

The current APK already exists. The builder refuses to overwrite an existing
version; increment both Android manifest versions before rebuilding for release.
Routine website changes do not need this command.

The release keystore and random password are stored outside the repository at
`%USERPROFILE%\.codex\secrets\papershapers-android`, restricted to the current
Windows account. Back up **the entire directory securely**. Do not commit,
upload, paste or email these private files. Restore them on a new build machine
or pass `-SigningDirectory` with the backed-up directory. Do not initialise a new
key for an app already distributed: Android will reject it as an update. The
default directory is an ACL-protected local secret store, not a managed vault;
move it to your controlled signing process when other contributors build releases.

## Adaptability contract

| Change | Reinstall needed? |
| --- | --- |
| Website layout, paper reader, navigation, payment UI | No: served by the website |
| Backend generation implementation or database schema | No: browser uses same-origin web APIs |
| New web feature supported by the browser | Usually no; test browser compatibility |
| App icon, native launcher behavior, Android target/compatibility | Yes: sign a new APK with the same key |
| Root domain or launcher entry URL | Preserve old HTTPS redirects, or ship a new APK |

Keep `/papershapers/dashboard` and `/papershapers/mobile` stable. Use a compatible
web deployment and versioned backend contracts; do not remove old entry URLs.
The APK has no remote code updater, background downloader or installation
permission. Native updates are explicit manual installations from the same
download page. Website rollback remains an ordinary Vercel rollback. Keep older
APK filenames for existing download links and do not replace immutable binaries.

## Privacy, distribution and validation

Browser cookie/session and draft storage rules remain the web app's rules. The
launcher does not read browser data or handle OAuth/payment tokens. There is no
automatic screenshot, telemetry, advertising, location or file permission.
Internet and AI access require the browser/network; the launcher cannot make
free-host cold starts disappear. This APK does not install on iPhones: use the
PWA there. Play Store publication requires a separately prepared store release
and review; this source intentionally does not introduce Play billing.

Verified locally: APK alignment and v2/v3 signatures, package/version/minimum
SDK, checksum, installation and launch on an Android emulator, Chrome handoff,
and no-browser fallback. Chrome first-run onboarding appeared in the emulator;
full live sign-in/checkout and real-device install remain operator acceptance
checks. No Play Protect verdict, store acceptance or physical-device support is
claimed. Developer verification requirements depend on region/device and are
changing; check them before broad sideload distribution.

References: [Custom Tabs low-level API](https://developer.chrome.com/docs/android/custom-tabs/howto-custom-tab-low-level-api),
[Android website distribution](https://developer.android.com/distribute/marketing-tools/alternative-distribution),
[developer verification](https://developer.android.com/developer-verification),
[APK signing](https://developer.android.com/build/building-cmdline).
