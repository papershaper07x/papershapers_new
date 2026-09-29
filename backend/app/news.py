from __future__ import annotations

import hashlib
import json
import re
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit, urlunsplit

import feedparser

from .database import Database
from .llm_router import LLMRouter


def _canonical_url(value: str) -> str:
    parts = urlsplit(value.strip())
    return urlunsplit((parts.scheme.lower(), parts.netloc.lower(), parts.path.rstrip("/"), "", ""))


def _plain_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", value or "")).strip()


def _article_id(url: str) -> str:
    return hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]


def ingest_records(database: Database, records: list[dict[str, Any]]) -> int:
    now = datetime.now(UTC).isoformat()
    inserted = 0
    with database.connect() as db:
        for record in records:
            url = _canonical_url(str(record.get("url") or record.get("link") or ""))
            title = _plain_text(str(record.get("title") or ""))
            if not url or not title:
                continue
            result = db.execute("INSERT OR IGNORE INTO news_articles (id, canonical_url, title, source, summary, body, category, image_url, published_at, ingested_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (_article_id(url), url, title[:300], _plain_text(str(record.get("source") or "Unknown source"))[:120], _plain_text(str(record.get("summary") or ""))[:1500], _plain_text(str(record.get("body") or record.get("summary") or ""))[:20000], _plain_text(str(record.get("category") or "General"))[:80], record.get("image_url"), str(record.get("published_at") or now), now))
            inserted += result.rowcount
    return inserted


def ingest_fixture(database: Database, path: Path) -> int:
    return ingest_records(database, json.loads(path.read_text(encoding="utf-8")))


def ingest_feeds(database: Database, feeds: list[str]) -> int:
    records: list[dict[str, Any]] = []
    for feed_url in feeds:
        parsed = feedparser.parse(feed_url)
        source = parsed.feed.get("title", urlsplit(feed_url).netloc)
        for entry in parsed.entries[:25]:
            records.append({"url": entry.get("link"), "title": entry.get("title"), "source": source, "summary": entry.get("summary", ""), "body": entry.get("summary", ""), "category": (entry.get("tags") or [{}])[0].get("term", "General"), "published_at": entry.get("published", datetime.now(UTC).isoformat())})
    return ingest_records(database, records)


def list_articles(database: Database, limit: int = 20, category: str | None = None) -> list[dict[str, Any]]:
    with database.connect() as db:
        if category:
            rows = db.execute("SELECT * FROM news_articles WHERE lower(category) = lower(?) ORDER BY published_at DESC LIMIT ?", (category, min(max(limit, 1), 50))).fetchall()
        else:
            rows = db.execute("SELECT * FROM news_articles ORDER BY published_at DESC LIMIT ?", (min(max(limit, 1), 50),)).fetchall()
    return [dict(row) for row in rows]


async def analyze_article(database: Database, router: LLMRouter, article_id: str) -> dict[str, Any] | None:
    with database.connect() as db:
        row = db.execute("SELECT * FROM news_articles WHERE id = ?", (article_id,)).fetchone()
    if not row:
        return None
    article = dict(row)
    fallback = {"fact_base": [article["summary"] or article["title"]], "lenses": {"left": {"headline": "Public value and access", "analysis": "Ask who gains access, who is excluded, and what public investment changes.", "questions": ["Who benefits first?", "What public value is created?"]}, "centre": {"headline": "Delivery and evidence", "analysis": "Separate the announced goal from funding, timeline, implementation capacity, and measurable outcomes.", "questions": ["What is funded?", "What can be measured?"]}, "right": {"headline": "Cost, choice, and incentives", "analysis": "Examine fiscal cost, private alternatives, regulation, and effects on individual or business choice.", "questions": ["What does it cost?", "Could competition deliver it?"]}}, "uncertainties": ["Fixture analysis: connect primary sources and editorial review before publication."], "is_demo": True}
    prompt = json.dumps({"task": "Analyze one reported event through left, centre, and right editorial lenses without changing the shared facts", "article": {key: article[key] for key in ("title", "source", "summary", "body", "published_at")}, "required_shape": {"fact_base": ["string"], "lenses": {"left": {"headline": "string", "analysis": "string", "questions": ["string"]}, "centre": {"headline": "string", "analysis": "string", "questions": ["string"]}, "right": {"headline": "string", "analysis": "string", "questions": ["string"]}}, "uncertainties": ["string"], "is_demo": False}}, ensure_ascii=False)
    result = await router.generate_json(system="You are an accountable news analysis assistant. Distinguish facts, framing, and uncertainty. Return JSON only; do not fabricate citations.", prompt=prompt, fallback=fallback)
    analysis = {**result.value, "article_id": article_id, "provider": result.provider}
    with database.connect() as db:
        db.execute("INSERT INTO news_perspectives (id, article_id, provider, analysis_json, created_at) VALUES (?, ?, ?, ?, ?)", (str(uuid.uuid4()), article_id, result.provider, json.dumps(analysis), datetime.now(UTC).isoformat()))
    return analysis
