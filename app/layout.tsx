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
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        <a className="skip-link" href="#main-content">Skip to content</a>
        <div id="main-content" tabIndex={-1}>{children}</div>

      </body>
    </html>
  );
}
