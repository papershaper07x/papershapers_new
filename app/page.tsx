import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader, SiteFooter } from "./components/SiteChrome";
import { getCurrentUser } from "../lib/auth";

export const metadata: Metadata = {
  title: "Paper Shapers — A house of useful ideas",
  description:
    "Explore practical tools for learning, balanced news, and neighbourhood discovery — all under one independent umbrella.",
};

const portals = [
  {
    number: "01",
    eyebrow: "AI Study Lab · CBSE 1–12",
    title: "Paper Shapers",
    description:
      "Make thoughtful practice papers, turn notes into questions, and shape research into something you can actually use.",
    action: "Enter the AI study lab",
    href: "/papershapers",
    className: "portal-card--study",
    detail: "Classes 1–12 · Live Rooms · AI Grading",
  },
  {
    number: "02",
    eyebrow: "Read all sides",
    title: "Perspective",
    description:
      "One story, three lenses. Compare how the left, centre, and right frame the same news without the shouting match.",
    action: "Open today’s edition",
    href: "/perspective",
    className: "portal-card--news",
    detail: "Context · Contrast · Clarity",
  },
  {
    number: "03",
    eyebrow: "Discover nearby",
    title: "Noticeboard",
    description:
      "A digital wall for the places around you — lunch specials, repair shops, classes, offers, events, and useful local finds.",
    action: "Browse the neighbourhood",
    href: "/noticeboard",
    className: "portal-card--local",
    detail: "Local posts · Real places · Fresh finds",
  },
];

export default async function Home() {
  const user = await getCurrentUser();
  return (
    <main>
      <SiteHeader user={user} />
      <section className="home-hero page-shell">
        <div className="hero-copy">
          <p className="kicker"><span>Independent studio</span> · Built in India</p>
          <h1>Three ideas.<br /><em>One useful</em> internet.</h1>
          <p className="hero-lede">
            Paper Shapers is growing into a small house of practical digital products — each with its own personality, all built to make everyday life a little clearer.
          </p>
          <div className="hero-actions">
            <a className="button button--dark" href="#ideas">Meet the ideas <span>↓</span></a>
            <a className="text-link" href="#principles">Why we’re building this <span>↗</span></a>
          </div>
        </div>
        <div className="hero-poster" aria-label="Three product portals: learn, understand, and discover">
          <div className="poster-orbit poster-orbit--one">Learn</div>
          <div className="poster-orbit poster-orbit--two">Understand</div>
          <div className="poster-orbit poster-orbit--three">Discover</div>
          <div className="poster-stamp">PS<br /><small>EST. 2025</small></div>
          <p>Good ideas deserve<br />room to become real.</p>
        </div>
      </section>

      <div className="marquee" aria-hidden="true">
        <div>LEARN SOMETHING <span>✦</span> SEE EVERY SIDE <span>✦</span> FIND WHAT’S NEARBY <span>✦</span> LEARN SOMETHING <span>✦</span> SEE EVERY SIDE <span>✦</span></div>
      </div>

      <section className="ideas-section page-shell" id="ideas">
        <div className="section-heading">
          <p className="kicker">The portals</p>
          <h2>Pick a door.</h2>
          <p>Each product works on its own. Together, they share one idea: technology should feel human, specific, and genuinely helpful.</p>
        </div>
        <div className="portal-grid">
          {portals.map((portal) => (
            <Link className={`portal-card ${portal.className}`} href={portal.href} key={portal.title}>
              <div className="portal-card__top"><span>{portal.number}</span><span>{portal.eyebrow}</span></div>
              <div className="portal-card__symbol" aria-hidden="true">{portal.number === "01" ? "Aa" : portal.number === "02" ? "≠" : "⌖"}</div>
              <div>
                <p className="portal-card__detail">{portal.detail}</p>
                <h3>{portal.title}</h3>
                <p>{portal.description}</p>
                <span className="portal-card__action">{portal.action} <b>↗</b></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="manifesto" id="principles">
        <div className="page-shell manifesto__grid">
          <div>
            <p className="kicker">Our operating system</p>
            <h2>Useful beats impressive.</h2>
          </div>
          <ol className="principle-list">
            <li><span>01</span><div><h3>Start with a real friction.</h3><p>No vague “AI for everything.” Every portal solves one recognisable, everyday problem.</p></div></li>
            <li><span>02</span><div><h3>Make the complex feel obvious.</h3><p>Clear language, friendly interfaces, and fewer steps between a question and a useful answer.</p></div></li>
            <li><span>03</span><div><h3>Grow without losing the plot.</h3><p>Shared foundations underneath; distinct products, communities, and visual voices on top.</p></div></li>
          </ol>
        </div>
      </section>

      <section className="closing-cta page-shell">
        <p className="kicker">This is only version one</p>
        <h2>Small ideas.<br />Shaped in public.</h2>
        <p>Explore what’s here, tell us what feels useful, and come back as these products grow.</p>
        <a className="button button--accent" href="mailto:hello@papershapers.in">Say hello <span>↗</span></a>
      </section>
      <section className="disclaimer-strip page-shell">
        <strong>Educational &amp; AI Practice Disclaimer:</strong> Paper Shapers study mock papers, live rooms, and automated evaluations are formative revision aids. They are neither affiliated with nor endorsed by CBSE or state examination authorities. AI evaluations and practice scores provide educational estimates to assist student revision and educator reviews.
      </section>
      <SiteFooter />
    </main>
  );
}
