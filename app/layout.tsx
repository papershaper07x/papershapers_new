import type { Metadata } from "next";
import { headers } from "next/headers";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "papershapers.in";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const origin = `${protocol}://${host}`;

  return {
    metadataBase: new URL(origin),
    title: { default: "Paper Shapers — A house of useful ideas", template: "%s · Paper Shapers" },
    description: "Practical digital products for learning, perspective, and local discovery.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      siteName: "Paper Shapers",
      title: "Three ideas. One useful internet.",
      description: "Explore practical tools for learning, balanced news, and neighbourhood discovery.",
      images: [{ url: `${origin}/og.png`, width: 1733, height: 909, alt: "Paper Shapers — Three ideas. One useful internet." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Three ideas. One useful internet.",
      description: "A house of practical digital products by Paper Shapers.",
      images: [`${origin}/og.png`],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
