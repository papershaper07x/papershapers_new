import type { MetadataRoute } from "next";
import { SITE_ORIGIN } from "../lib/site";

export default function robots(): MetadataRoute.Robots {
  if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production')return {rules:{userAgent:'*',disallow:'/'}};
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/auth", "/papershapers/dashboard", "/papershapers/papers", "/papershapers/tests/", "/papershapers/for-teachers/rooms", "/papershapers/room/", "/papershapers/journal/new", "/noticeboard/dashboard", "/noticeboard/post", "/noticeboard/report"] },
    sitemap: `${SITE_ORIGIN}/sitemap.xml`,
  };
}
