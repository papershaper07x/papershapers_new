import { NextResponse, type NextRequest } from "next/server";
import { publicRedirect } from "./lib/seo";

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
  if (request.method === "GET" || request.method === "HEAD") {
    const destination = publicRedirect(request.nextUrl.host, request.nextUrl.pathname);
    if (destination) {
      const url = new URL(destination);
      url.search = request.nextUrl.search;
      return NextResponse.redirect(url, 308);
    }
  }
  // Count incoming page requests, not people or completed page views. Skip prefetch.
  if (request.method === "GET" && !request.headers.has("next-router-prefetch") && !request.headers.get("purpose")?.includes("prefetch") && !request.headers.get("sec-purpose")?.includes("prefetch")) {
    console.info(JSON.stringify({ schema: 1, service: "web", event: "page.request", timestamp: new Date().toISOString(), operation: pageGroup(request.nextUrl.pathname) }));
  }
  return NextResponse.next();
}

export const config = { matcher: ["/", "/privacy", "/terms", "/cookies", "/auth", "/papershapers/:path*", "/syllabus/:path*", "/noticeboard/:path*"] };
