import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return { id: "/papershapers", name: "Paper Shapers Study", short_name: "Study", description: "Your private practice desk, papers and study history.", start_url: "/papershapers/dashboard", scope: "/", display: "standalone", background_color: "#f7f5ef", theme_color: "#17263c", icons: [{ src: "/app-icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" }, { src: "/app-icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }] };
}
