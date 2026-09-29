"use client";

import Link from "next/link";
import { useState } from "react";
import { portalDashboardUrl, portalUrls } from "../../lib/portals";

type Portal = "study" | "news" | "marketplace";

const portalIdentity = {
  study: { label: "Study", mark: "∑", home: portalUrls.study },
  news: { label: "Perspective", mark: "P.", home: portalUrls.news },
  marketplace: { label: "Nearby", mark: "⌖", home: portalUrls.marketplace },
};

export function SiteHeader({ portal, user }: { portal?: Portal; user?: { name: string } | null }) {
  const [open, setOpen] = useState(false);
  const identity = portal ? portalIdentity[portal] : null;
  return (
    <header className={`site-header ${portal ? `site-header--${portal}` : "site-header--home"}`}>
      <div className="site-header__inner page-shell">
        <Link className="brand" href={identity?.home ?? portalUrls.home} aria-label={identity ? `${identity.label} home` : "Paper Shapers home"}>
          <span className="brand-mark">{identity?.mark ?? "P/S"}</span>
          <span>{identity?.label ?? "Paper Shapers"}{identity && <small>by Paper Shapers</small>}</span>
        </Link>
        <button className="menu-button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">Toggle menu</span><i></i><i></i>
        </button>
        <nav id="primary-nav" className={open ? "nav nav--open" : "nav"} aria-label="Primary navigation">
          {portal === "study" && <><Link href="/papershapers/tests/new">Create a paper</Link><Link href="/papershapers/how-it-works">How it works</Link><Link href="/papershapers/study-guide">Study guide</Link><Link href="/papershapers/for-teachers">For teachers</Link><Link href="/papershapers/contact">Contact</Link></>}
          {portal === "news" && <><a href="#today">Today</a><a href="#method">Our method</a></>}
          {portal === "marketplace" && <><a href="#board">Explore nearby</a><a href="#principles">How it works</a></>}
          {!portal && <Link href="/#ideas">The products</Link>}
          {portal !== "study" && <><a className="portal-switch" href={portalUrls.study}>Study</a><a className="portal-switch" href={portalUrls.news}>News</a><a className="portal-switch" href={portalUrls.marketplace}>Nearby</a></>}
          {user && portal ? <a className="nav-pill" href={portalDashboardUrl(portal)}>{portal === "study" ? "My study desk" : `Hi, ${user.name.split(" ")[0]} · Dashboard`}</a> : <Link className="nav-pill" href={`/auth?next=${encodeURIComponent(portal ? portalDashboardUrl(portal) : "/papershapers/dashboard")}`}>{portal === "study" ? "Sign in to practise" : "Sign in"} ↗</Link>}
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter({ portal }: { portal?: Portal }) {
  return (
    <footer className={`site-footer ${portal ? `site-footer--${portal}` : ""}`}>
      <div className="page-shell footer-grid">
        {portal === "study" ? <><div><span className="brand-mark brand-mark--light">∑</span><p>CBSE practice that keeps<br />the learner in the loop.</p></div><div><p className="footer-label">Study paths</p><Link href="/papershapers/tests/new">Create a paper</Link><Link href="/papershapers/how-it-works">How it works</Link><Link href="/papershapers/study-guide">Study guide &amp; FAQs</Link></div><div><p className="footer-label">For educators</p><Link href="/papershapers/for-teachers">Teachers &amp; coaching teams</Link><Link href="/papershapers/contact">Contact &amp; feedback</Link><a href="mailto:hello@papershapers.in">hello@papershapers.in</a></div><div className="footer-note"><p>Practice.<br />Reflect.<br />Repeat.</p></div></> : <><div><span className="brand-mark brand-mark--light">P/S</span><p>A house of useful ideas,<br />shaped in India.</p></div><div><p className="footer-label">Explore</p><a href={portalUrls.study}>Study</a><a href={portalUrls.news}>Perspective</a><a href={portalUrls.marketplace}>Nearby</a></div><div><p className="footer-label">Contact</p><a href="mailto:hello@papershapers.in">hello@papershapers.in</a><a href="https://www.linkedin.com/company/papershapersai">LinkedIn ↗</a><a href="https://www.instagram.com/papershapers_works/">Instagram ↗</a></div><div className="footer-note"><p>Independent.<br />Curious.<br />Still shaping.</p></div></>}
      </div>
      <div className="page-shell footer-bottom"><span>© {new Date().getFullYear()} Paper Shapers</span><span><Link href="/privacy">Privacy</Link> · <Link href="/terms">Terms</Link> · Made with care, not hype.</span></div>
    </footer>
  );
}
