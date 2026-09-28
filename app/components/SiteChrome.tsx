"use client";

import Link from "next/link";
import { useState } from "react";

export function SiteHeader({ portal }: { portal?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header">
      <div className="site-header__inner page-shell">
        <Link className="brand" href="/" aria-label="Paper Shapers home">
          <span className="brand-mark">P/S</span>
          <span>Paper Shapers{portal && <small>{portal}</small>}</span>
        </Link>
        <button className="menu-button" aria-expanded={open} aria-controls="primary-nav" onClick={() => setOpen(!open)}>
          <span className="sr-only">Toggle menu</span><i></i><i></i>
        </button>
        <nav id="primary-nav" className={open ? "nav nav--open" : "nav"} aria-label="Primary navigation">
          <Link href="/#ideas">Ideas</Link>
          <Link href="/papershapers">Study lab</Link>
          <Link href="/perspective">News desk</Link>
          <Link href="/noticeboard">Noticeboard</Link>
          <a className="nav-pill" href="mailto:hello@papershapers.in">Let’s talk ↗</a>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="page-shell footer-grid">
        <div><span className="brand-mark brand-mark--light">P/S</span><p>A house of useful ideas,<br />shaped in India.</p></div>
        <div><p className="footer-label">Explore</p><Link href="/papershapers">Study lab</Link><Link href="/perspective">Perspective</Link><Link href="/noticeboard">Noticeboard</Link></div>
        <div><p className="footer-label">Contact</p><a href="mailto:hello@papershapers.in">hello@papershapers.in</a><a href="https://www.linkedin.com/company/papershapersai">LinkedIn ↗</a><a href="https://www.instagram.com/papershapers_works/">Instagram ↗</a></div>
        <div className="footer-note"><p>Independent.<br />Curious.<br />Still shaping.</p></div>
      </div>
      <div className="page-shell footer-bottom"><span>© {new Date().getFullYear()} Paper Shapers</span><span>Made with care, not hype.</span></div>
    </footer>
  );
}
