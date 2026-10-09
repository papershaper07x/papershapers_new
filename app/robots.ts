import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth", "/papershapers/dashboard", "/papershapers/papers", "/papershapers/tests/", "/papershapers/for-teachers/rooms", "/papershapers/room/", "/papershapers/journal/new", "/noticeboard/dashboard"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
