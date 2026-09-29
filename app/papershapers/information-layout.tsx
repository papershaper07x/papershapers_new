import type { ReactNode } from "react";
import { SiteFooter, SiteHeader } from "../components/SiteChrome";
import { getCurrentUser } from "../../lib/auth";

export async function StudyInformationLayout({ eyebrow, title, lede, children }: { eyebrow: string; title: ReactNode; lede: string; children: ReactNode }) {
  const user = await getCurrentUser();
  return <main className="study-information"><SiteHeader portal="study" user={user} /><header className="study-information__hero page-shell"><p className="kicker">{eyebrow}</p><h1>{title}</h1><p>{lede}</p></header>{children}<SiteFooter portal="study" /></main>;
}
