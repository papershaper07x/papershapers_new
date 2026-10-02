import type { Metadata } from "next";
import { headers } from "next/headers";
import { inter, sourceSerif, jetbrainsMono } from "./fonts";
import "./globals.css";
import "./portal-ui.css";

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

import Script from "next/script";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable} ${jetbrainsMono.variable}`}>
      <body>
        {children}
        {process.env.NEXT_PUBLIC_CLARITY_ID && (
          <Script id="microsoft-clarity" strategy="afterInteractive">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${process.env.NEXT_PUBLIC_CLARITY_ID}");
            `}
          </Script>
        )}
      </body>
    </html>
  );
}
