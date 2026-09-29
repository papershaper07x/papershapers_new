"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export function AccountNudge({ portal, next }: { portal: "news" | "marketplace"; next: string }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (window.sessionStorage.getItem(`ps-nudge-${portal}`) === "dismissed") return;
    const timer = window.setTimeout(() => setVisible(true), 4500);
    return () => window.clearTimeout(timer);
  }, [portal]);
  if (!visible) return null;
  const copy = portal === "news"
    ? { eyebrow: "Make Perspective yours", title: "Save stories. Follow themes. Keep your reading history." }
    : { eyebrow: "A better local board", title: "Tune nearby finds to your area and interests." };
  return <aside className={`account-nudge account-nudge--${portal}`} aria-label="Create an account">
    <button aria-label="Dismiss" onClick={() => { window.sessionStorage.setItem(`ps-nudge-${portal}`, "dismissed"); setVisible(false); }} type="button">×</button>
    <span>{copy.eyebrow}</span><strong>{copy.title}</strong>
    <Link href={`/auth?next=${encodeURIComponent(next)}`}>Create a free account →</Link>
  </aside>;
}
