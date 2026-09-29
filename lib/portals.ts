export const portalUrls = {
  home: process.env.NEXT_PUBLIC_HOME_ORIGIN || "/",
  study: process.env.NEXT_PUBLIC_STUDY_ORIGIN || "/papershapers",
  news: process.env.NEXT_PUBLIC_NEWS_ORIGIN || "/perspective",
  marketplace: process.env.NEXT_PUBLIC_MARKET_ORIGIN || "/noticeboard",
};

export function portalDashboardUrl(portal: "study" | "news" | "marketplace") {
  const base = portalUrls[portal];
  return `${base === "/" ? "" : base}/dashboard`;
}
