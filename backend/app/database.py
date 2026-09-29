from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator


class Database:
    def __init__(self, path: Path):
        self.path = path

    @contextmanager
    def connect(self) -> Iterator[sqlite3.Connection]:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        connection = sqlite3.connect(self.path, timeout=10)
        connection.row_factory = sqlite3.Row
        connection.execute("PRAGMA foreign_keys = ON")
        connection.execute("PRAGMA journal_mode = WAL")
        try:
            yield connection
            connection.commit()
        except Exception:
            connection.rollback()
            raise
        finally:
            connection.close()

    def initialize(self) -> None:
        with self.connect() as db:
            db.executescript("""
                CREATE TABLE IF NOT EXISTS generated_papers (
                    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, paper_size TEXT NOT NULL,
                    board TEXT NOT NULL, grade TEXT NOT NULL, subject TEXT NOT NULL,
                    chapters_json TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL,
                    paper_json TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS generated_papers_user_idx
                    ON generated_papers(user_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS generated_paper_cache (
                    generation_key TEXT PRIMARY KEY, provider TEXT NOT NULL,
                    paper_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS generated_paper_cache_expiry_idx
                    ON generated_paper_cache(expires_at);
                CREATE TABLE IF NOT EXISTS paper_attempts (
                    id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, user_id TEXT NOT NULL,
                    status TEXT NOT NULL, provider TEXT NOT NULL, answers_json TEXT NOT NULL,
                    score_json TEXT NOT NULL, started_at TEXT NOT NULL, submitted_at TEXT NOT NULL,
                    FOREIGN KEY (paper_id) REFERENCES generated_papers(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS paper_attempts_paper_user_idx
                    ON paper_attempts(paper_id, user_id, submitted_at DESC);
                CREATE TABLE IF NOT EXISTS paper_feedback (
                    id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, user_id TEXT NOT NULL,
                    category TEXT NOT NULL, comment TEXT NOT NULL, created_at TEXT NOT NULL,
                    FOREIGN KEY (paper_id) REFERENCES generated_papers(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS paper_feedback_paper_idx
                    ON paper_feedback(paper_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS news_articles (
                    id TEXT PRIMARY KEY, canonical_url TEXT NOT NULL UNIQUE, title TEXT NOT NULL,
                    source TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL,
                    category TEXT NOT NULL, image_url TEXT, published_at TEXT NOT NULL,
                    ingested_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS news_articles_published_idx
                    ON news_articles(published_at DESC);
                CREATE TABLE IF NOT EXISTS news_perspectives (
                    id TEXT PRIMARY KEY, article_id TEXT NOT NULL, provider TEXT NOT NULL,
                    analysis_json TEXT NOT NULL, created_at TEXT NOT NULL,
                    FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE
                );
                CREATE INDEX IF NOT EXISTS news_perspectives_article_idx
                    ON news_perspectives(article_id, created_at DESC);
                CREATE TABLE IF NOT EXISTS marketplace_listings (
                    id TEXT PRIMARY KEY, title TEXT NOT NULL, place TEXT NOT NULL,
                    area TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL,
                    price_label TEXT, expires_at TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0,
                    metadata_json TEXT NOT NULL, created_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS marketplace_area_category_idx
                    ON marketplace_listings(area, category, expires_at);
            """)

    @staticmethod
    def decode(row: sqlite3.Row, *json_fields: str) -> dict[str, Any]:
        result = dict(row)
        for field in json_fields:
            result[field.removesuffix("_json")] = json.loads(result.pop(field))
        return result
