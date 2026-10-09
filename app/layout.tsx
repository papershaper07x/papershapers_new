import type { Metadata } from "next";
import { SITE_ORIGIN } from "../lib/site";
import { inter, sourceSerif, jetbrainsMono } from "./fonts";
import "./globals.css";
import "./portal-ui.css";

export async function generateMetadata(): Promise<Metadata> {
  const origin = SITE_ORIGIN;

  return {
    metadataBase: new URL(origin),
    title: { default: "Paper Shapers — A house of useful ideas", template: "%s · Paper Shapers" },
    description: "Practical digital products for learning and local discovery.",
    icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
    openGraph: {
      type: "website",
      siteName: "Paper Shapers",
      title: "Two ideas. One useful internet.",
      description: "Explore practical tools for learning and neighbourhood discovery.",
      images: [{ url: `${origin}/opengraph-image`, width: 1200, height: 630, alt: "Paper Shapers — Two ideas. One useful internet." }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Two ideas. One useful internet.",
      description: "A house of practical digital products by Paper Shapers.",
      images: [`${origin}/opengraph-image`],
    },
  };
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div id="main-content" tabIndex={-1}>{children}</div>

      </body>
    </html>
  );
}
