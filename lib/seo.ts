import type { Metadata } from "next";
import { SITE_ORIGIN } from "./site";

export type PublicSite = "home" | "study" | "nearby";
export const siteOrigins: Record<PublicSite, string> = {
  home: new URL(SITE_ORIGIN).origin,
  study: new URL(process.env.NEXT_PUBLIC_STUDY_ORIGIN || SITE_ORIGIN).origin,
  nearby: new URL(process.env.NEXT_PUBLIC_MARKET_ORIGIN || SITE_ORIGIN).origin,
};

export function siteForPath(path: string): PublicSite {
  path = path.split(/[?#]/)[0];
  if (path === "/papershapers" || path.startsWith("/papershapers/")) return "study";
  if (path === "/noticeboard" || path.startsWith("/noticeboard/")) return "nearby";
  return "home";
}

export function siteForHost(host: string): PublicSite {
  return (["study", "nearby"] as const).find(site => siteOrigins[site] !== siteOrigins.home && new URL(siteOrigins[site]).host === host) || "home";
}

export function canonicalUrl(path: string) {
  return new URL(path, siteOrigins[siteForPath(path)]).href;
}

// Keep local navigation local when a portal domain is not configured.
export function siteHref(path: string) {
  const site = siteForPath(path);
  const configured = site === "study" ? process.env.NEXT_PUBLIC_STUDY_ORIGIN : site === "nearby" ? process.env.NEXT_PUBLIC_MARKET_ORIGIN : process.env.NEXT_PUBLIC_HOME_ORIGIN;
  return configured ? canonicalUrl(path) : path;
}

export const publicPaths = ["/", "/privacy", "/terms", "/cookies", "/syllabus", "/papershapers", "/papershapers/how-it-works", "/papershapers/study-guide", "/papershapers/for-teachers", "/papershapers/contact", "/papershapers/journal", "/papershapers/membership", "/papershapers/mobile", "/papershapers/dedication", "/noticeboard", "/noticeboard/safety", "/noticeboard/guides"];

export function isPublicPage(path: string) {
  return publicPaths.includes(path) || /^\/syllabus\/class-(?:[1-9]|1[0-2])(?:\/[^/]+)?$/.test(path)
    || /^\/papershapers\/journal\/(?!new$)[^/]+$/.test(path)
    || /^\/noticeboard\/(?:guides|notices)\/[^/]+$/.test(path);
}

export function publicRedirect(host: string, path: string): string | null {
  const originalPath = path;
  // Preview/local hosts and private workflows must keep their own origin.
  const homeHost = new URL(siteOrigins.home).hostname;
  const hosts = new Set(Object.values(siteOrigins).map(origin => new URL(origin).host));
  if (!hosts.has(host) && host !== `www.${homeHost}`) return null;
  if (path === "/" && siteForHost(host) !== "home") path = siteForHost(host) === "study" ? "/papershapers" : "/noticeboard";
  if (!isPublicPage(path)) return null;
  const url = canonicalUrl(path);
  return new URL(url).host !== host || path !== originalPath ? url : null;
}

export function pageMetadata(path: string, title: string, description: string): Metadata {
  const site = siteForPath(path);
  const url = canonicalUrl(path);
  const image = `${siteOrigins.home}/opengraph-image`;
  return {
    title,
    description,
    alternates: { canonical: url },
    appleWebApp: { capable: true, title: site === "study" ? "Study" : site === "nearby" ? "Nearby" : "Paper Shapers", statusBarStyle: "default" },
    openGraph: { type: "website", siteName: "Paper Shapers", url, title, description, images: [{ url: image, width: 1200, height: 630, alt: "Paper Shapers — Learning and local discovery" }] },
    twitter: { card: "summary_large_image", title, description, images: [image] },
  };
}

export const organizationId = `${siteOrigins.home}/#organization`;
export const brandSchema = {
  "@context": "https://schema.org",
  "@graph": [
    { "@type": "Organization", "@id": organizationId, name: "Paper Shapers", url: siteOrigins.home, logo: `${siteOrigins.home}/app-icon-512.png`, email: "hello@papershapers.in", sameAs: ["https://www.linkedin.com/company/papershapersai", "https://www.instagram.com/papershapers_works/"] },
    { "@type": "WebSite", "@id": `${siteOrigins.home}/#website`, name: "Paper Shapers", url: siteOrigins.home, publisher: { "@id": organizationId } },
  ],
};
