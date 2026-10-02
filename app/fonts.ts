import { Inter, Source_Serif_4, JetBrains_Mono } from "next/font/google";

/**
 * Body text — clean geometric sans with excellent reading metrics.
 * Replaces the previous Arial / Helvetica default.
 */
export const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-body",
});

/**
 * Display headings — editorial serif with optical sizing.
 * Replaces hard-coded Georgia across the site and fills in
 * the previously-undefined --font-display custom property.
 */
export const sourceSerif = Source_Serif_4({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
});

/**
 * Labels, kickers, monospace accents — purposeful monospace.
 * Replaces "Courier New" which read as a developer default.
 */
export const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "700", "800"],
});
