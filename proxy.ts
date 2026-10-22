import { NextResponse, type NextRequest } from "next/server";

function pageGroup(path: string) {
  if (path === "/") return "home";
  if (path === "/auth") return "auth";
  if (path.startsWith("/syllabus")) return "curriculum";
  if (path.startsWith("/noticeboard")) return "nearby";
  if (path === "/papershapers") return "study.home";
  const section = path.split("/")[2];
  if (path.startsWith("/papershapers/") && ["tests", "papers", "dashboard", "room", "for-teachers", "journal", "contact", "membership", "mobile", "how-it-works", "study-guide", "dedication"].includes(section)) return `study.${section}`;
  return "other";
}

export function proxy(request: NextRequest) {
  // Map only domain roots; all existing portal and API paths stay stable.
  if (request.nextUrl.pathname === "/") {
    const portal = request.nextUrl.hostname === "marketplace.papershapers.in" ? "/noticeboard" : request.nextUrl.hostname === "study.papershapers.in" ? "/papershapers" : null;
    if (portal) {
      const url = request.nextUrl.clone();
      url.pathname = portal;
      return NextResponse.rewrite(url);
    }
  }
  // Count incoming page requests, not people or completed page views. Skip prefetch.
  if (request.method === "GET" && !request.headers.has("next-router-prefetch") && !request.headers.get("purpose")?.includes("prefetch") && !request.headers.get("sec-purpose")?.includes("prefetch")) {
    console.info(JSON.stringify({ schema: 1, service: "web", event: "page.request", timestamp: new Date().toISOString(), operation: pageGroup(request.nextUrl.pathname) }));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/auth", "/papershapers/:path*", "/syllabus/:path*", "/noticeboard/:path*"] };
