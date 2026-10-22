"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { StudyFinder } from "../papershapers/study-finder";
import { portalDashboardUrl, portalUrls } from "../../lib/portals";

type Portal = "study" | "marketplace";

const portalIdentity = {
  study: { label: "Study", mark: "∑", home: portalUrls.study },
  marketplace: { label: "Nearby", mark: "⌖", home: portalUrls.marketplace },
};

export function SiteHeader({ portal, user }: { portal?: Portal; user?: { name: string } | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const identity = portal ? portalIdentity[portal] : null;
  return (
    <header className={`site-header ${portal ? `site-header--${portal}` : "site-header--home"}`}>
      <div className="site-header__inner page-shell">
        <Link prefetch={false} className="brand" href={portalUrls.home} aria-label="Paper Shapers home">
          <span className="brand-mark">P/S</span>
          <span>Paper Shapers{identity && <small>{identity.label}</small>}</span>
        </Link>
        <button className="menu-button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">Toggle menu</span><i></i><i></i>
        </button>
        <nav id="primary-nav" className={open ? "nav nav--open" : "nav"} aria-label="Primary navigation" onClick={(event) => {
          if ((event.target as HTMLElement).closest("a")) setOpen(false);
        }} onKeyDown={(event) => { if (event.key === "Escape") { setOpen(false); event.currentTarget.parentElement?.querySelector<HTMLButtonElement>(".menu-button")?.focus(); } }}>
          {portal === "study" && <StudyFinder key={pathname} />}
          {portal === "study" && <><Link prefetch={false} href="/papershapers/tests/new" aria-current={pathname === "/papershapers/tests/new" || pathname.startsWith("/papershapers/tests/new/") ? "page" : undefined}>Create a paper</Link><Link prefetch={false} href="/syllabus" aria-current={pathname === "/syllabus" || pathname.startsWith("/syllabus/") ? "page" : undefined}>Curriculum</Link><Link prefetch={false} href="/papershapers/how-it-works" aria-current={pathname === "/papershapers/how-it-works" || pathname.startsWith("/papershapers/how-it-works/") ? "page" : undefined}>How it works</Link><Link prefetch={false} href="/papershapers/study-guide" aria-current={pathname === "/papershapers/study-guide" || pathname.startsWith("/papershapers/study-guide/") ? "page" : undefined}>Study guide</Link><Link prefetch={false} href="/papershapers/membership" aria-current={pathname === "/papershapers/membership" || pathname.startsWith("/papershapers/membership/") ? "page" : undefined}>Free & Study Plus</Link><Link prefetch={false} href="/papershapers/for-teachers" aria-current={pathname === "/papershapers/for-teachers" || pathname.startsWith("/papershapers/for-teachers/") ? "page" : undefined}>For teachers</Link><Link prefetch={false} href="/papershapers/contact" aria-current={pathname === "/papershapers/contact" || pathname.startsWith("/papershapers/contact/") ? "page" : undefined}>Contact</Link></>}
          {portal === "marketplace" && <><Link prefetch={false} href="/noticeboard#board">Explore nearby</Link><Link prefetch={false} href="/noticeboard#principles">How it works</Link><Link prefetch={false} href="/noticeboard/post">Post a notice</Link></>}
          {!portal && <Link prefetch={false} href="/#ideas">The products</Link>}
          {!portal && <><a className="portal-switch" href={portalUrls.study}>Study</a><a className="portal-switch" href={portalUrls.marketplace}>Nearby</a></>}
          {user && portal ? <a className="nav-pill" href={portalDashboardUrl(portal)}>{portal === "study" ? "My study desk" : `Hi, ${user.name.split(" ")[0]} · Dashboard`}</a> : <Link prefetch={false} className="nav-pill" href={`/auth?next=${encodeURIComponent(portal ? portalDashboardUrl(portal) : "/papershapers/dashboard")}`}>{portal === "study" ? "Sign in to practise" : "Sign in"} ↗</Link>}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ portal }: { portal?: Portal }) {
  return (
    <footer className={`site-footer ${portal ? `site-footer--${portal}` : ""}`}>
      <div className="page-shell footer-grid">
        {portal === "study" ? <><div><span className="brand-mark brand-mark--light">∑</span><p>CBSE practice that keeps<br />the learner in the loop.</p></div><div><p className="footer-label">Study paths</p><Link prefetch={false} href="/papershapers/tests/new">Create a paper</Link><Link prefetch={false} href="/syllabus">Curriculum</Link><Link prefetch={false} href="/papershapers/how-it-works">How it works</Link><Link prefetch={false} href="/papershapers/study-guide">Study guide &amp; FAQs</Link><Link prefetch={false} href="/papershapers/journal">Journal &amp; student notes</Link></div><div><p className="footer-label">Talk with us</p><Link prefetch={false} href="/papershapers/membership">Study Plus &amp; contributions</Link><Link prefetch={false} href="/papershapers/mobile">Install the mobile app</Link><Link prefetch={false} href="/papershapers/for-teachers">Teachers &amp; coaching teams</Link><Link prefetch={false} href="/papershapers/contact">Contact &amp; feedback</Link><Link prefetch={false} href="/papershapers/dedication">A small dedication</Link><a href="mailto:hello@papershapers.in">hello@papershapers.in</a></div><div className="footer-note"><p>Practice.<br />Reflect.<br />Repeat.</p></div></> : <><div><span className="brand-mark brand-mark--light">P/S</span><p>A house of useful ideas,<br />shaped in India.</p></div><div><p className="footer-label">{portal === "marketplace" ? "Nearby paths" : "Explore"}</p>{portal === "marketplace" ? <><Link prefetch={false} href="/noticeboard">Explore the board</Link><Link prefetch={false} href="/noticeboard/guides">Neighbourhood guides</Link><Link prefetch={false} href="/noticeboard/safety">Safety policy</Link><a href={portalUrls.home}>Paper Shapers home</a></> : <><a href={portalUrls.study}>Study</a><a href={portalUrls.marketplace}>Nearby</a></>}</div><div><p className="footer-label">Contact</p><a href="mailto:hello@papershapers.in">hello@papershapers.in</a><a href="https://www.linkedin.com/company/papershapersai">LinkedIn ↗</a><a href="https://www.instagram.com/papershapers_works/">Instagram ↗</a></div><div className="footer-note"><p>Independent.<br />Curious.<br />Still shaping.</p></div></>}
      </div>
      <div className="page-shell footer-bottom"><span>© {new Date().getFullYear()} Paper Shapers</span><span><Link prefetch={false} href="/privacy">Privacy</Link> · <Link prefetch={false} href="/terms">Terms</Link> · <Link prefetch={false} href="/cookies">Cookies</Link>{portal !== "marketplace" && <> · <Link prefetch={false} href="/papershapers/membership">Contribute</Link> · <Link prefetch={false} href="/papershapers/mobile">Mobile app</Link></>} · Made with care, not hype.</span></div>
    </footer>
  );
}
