"use client";

import { useMemo, useState } from "react";

const posts = [
  { category: "Food", icon: "☀", title: "Sunday sourdough drop", place: "Starter Culture", area: "Indiranagar", meta: "Pre-orders close Sat · 6 PM", tone: "yellow" },
  { category: "Services", icon: "⚡", title: "Same-day mixer repair", place: "Bharat Electricals", area: "Domlur", meta: "Call before 4 PM", tone: "blue" },
  { category: "Classes", icon: "✎", title: "Weekend pottery circle", place: "Soft Earth Studio", area: "Ulsoor", meta: "4 seats left · Ages 16+", tone: "pink" },
  { category: "Events", icon: "♫", title: "Open mic under the trees", place: "Neighbourhood Library", area: "HAL 2nd Stage", meta: "Friday · 7:30 PM", tone: "green" },
  { category: "Offers", icon: "₹", title: "Lunch bowl + lime soda", place: "Little Goa Canteen", area: "Indiranagar", meta: "₹199 · Weekdays only", tone: "orange" },
  { category: "Community", icon: "↻", title: "Book swap: bring one, take one", place: "The Corner Shelf", area: "Jeevan Bhima Nagar", meta: "All month · Free", tone: "cream" },
];

export function LocalBoard() {
  const [filter, setFilter] = useState("All");
  const categories = ["All", "Food", "Offers", "Events", "Services", "Classes", "Community"];
  const visible = useMemo(() => filter === "All" ? posts : posts.filter((post) => post.category === filter), [filter]);
  return <>
    <section className="local-hero page-shell"><div><p className="kicker"><span>03</span> Your neighbourhood, online</p><h1>What’s good<br /><em>around here?</em></h1><p className="hero-lede">Local finds shouldn’t disappear in a noisy group chat. Noticeboard gives nearby shops, makers, classes, and communities one cheerful place to post.</p><a className="button button--dark" href="#board">See what’s up ↓</a></div><div className="pin-cluster" aria-hidden="true"><div className="mini-note mini-note--one">Fresh idlis<br /><b>7—10 AM</b></div><div className="mini-note mini-note--two">CYCLE<br />REPAIR<br /><b>while you wait</b></div><div className="mini-note mini-note--three">SATURDAY<br /><b>BOOK SWAP</b></div><span className="map-pin">⌖</span></div></section>
    <section className="board-section" id="board"><div className="page-shell"><div className="board-heading"><div><p className="kicker">Around Indiranagar · Bengaluru</p><h2>The board today.</h2></div><button type="button" className="post-button" onClick={() => alert("Posting tools will arrive with the local business backend.")}>+ Post something</button></div><div className="filter-row" role="group" aria-label="Filter local posts">{categories.map((category) => <button key={category} className={filter === category ? "is-active" : ""} onClick={() => setFilter(category)} type="button">{category}</button>)}</div><div className="notice-grid" aria-live="polite">{visible.map((post) => <article className={`notice-card notice-card--${post.tone}`} key={post.title}><div className="notice-card__top"><span>{post.category}</span><b>{post.icon}</b></div><h3>{post.title}</h3><p>{post.place}</p><div className="notice-card__meta"><span>⌖ {post.area}</span><span>{post.meta}</span></div><button type="button" aria-label={`Save ${post.title}`}>SAVE +</button></article>)}</div>{visible.length === 0 && <p className="empty-state">Nothing pinned here yet. Be the first to post.</p>}</div></section>
    <section className="local-principles page-shell"><div><p className="kicker">Built for the street, not the feed</p><h2>Less scroll.<br />More local.</h2></div><div><p><b>Fresh by default.</b> Posts expire, so the board stays useful.</p><p><b>Distance matters.</b> See what is genuinely close before what is merely popular.</p><p><b>Businesses stay human.</b> Clear pricing, real addresses, and simple ways to get in touch.</p></div></section>
  </>;
}
