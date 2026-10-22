import { NextResponse } from "next/server";
import release from "../../../public/downloads/android-release.json";

// Keep the shared link stable; immutable filenames keep caches and checksums sane.
export function GET(request: Request) {
  const target = new URL(`/downloads/${release.filename}`, request.url);
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } });
}
