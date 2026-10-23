import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { siteForHost } from "../lib/seo";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const site = siteForHost((await headers()).get("host") || "");
  const identity = site === "study"
    ? { id: "/papershapers", name: "Paper Shapers Study", short_name: "Study", description: "Your private practice desk, papers and study history.", start_url: "/papershapers/dashboard" }
    : site === "nearby"
      ? { id: "/noticeboard", name: "Paper Shapers Nearby", short_name: "Nearby", description: "Discover local events, classes and community notices.", start_url: "/noticeboard" }
      : { id: "/", name: "Paper Shapers", short_name: "Paper Shapers", description: "CBSE chapter practice and local community notices.", start_url: "/" };
  return { ...identity, scope: "/", display: "standalone", background_color: "#f7f5ef", theme_color: "#17263c", icons: [{ src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
