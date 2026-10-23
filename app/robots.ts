import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteForHost, siteOrigins } from "../lib/seo";

export default async function robots(): Promise<MetadataRoute.Robots> {
  if(process.env.VERCEL==='1'&&process.env.VERCEL_ENV!=='production')return {rules:{userAgent:'*',disallow:'/'}};
  const site = siteForHost((await headers()).get("host") || "");
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/"] },
    sitemap: `${siteOrigins[site]}/sitemaps/${site}.xml`,
  };
}
