from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Iterator, Mapping


SQLITE_SCHEMA = """
CREATE TABLE IF NOT EXISTS generated_papers (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, paper_size TEXT NOT NULL, board TEXT NOT NULL, grade TEXT NOT NULL, subject TEXT NOT NULL, chapters_json TEXT NOT NULL, provider TEXT NOT NULL, status TEXT NOT NULL, paper_json TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE INDEX IF NOT EXISTS generated_papers_user_idx ON generated_papers(user_id, created_at DESC);
CREATE TABLE IF NOT EXISTS generated_paper_cache (generation_key TEXT PRIMARY KEY, provider TEXT NOT NULL, paper_json TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS paper_attempts (id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, user_id TEXT NOT NULL, status TEXT NOT NULL, provider TEXT NOT NULL, answers_json TEXT NOT NULL, score_json TEXT NOT NULL, started_at TEXT NOT NULL, submitted_at TEXT NOT NULL, FOREIGN KEY (paper_id) REFERENCES generated_papers(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS paper_feedback (id TEXT PRIMARY KEY, paper_id TEXT NOT NULL, user_id TEXT NOT NULL, category TEXT NOT NULL, comment TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (paper_id) REFERENCES generated_papers(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS news_articles (id TEXT PRIMARY KEY, canonical_url TEXT NOT NULL UNIQUE, title TEXT NOT NULL, source TEXT NOT NULL, summary TEXT NOT NULL, body TEXT NOT NULL, category TEXT NOT NULL, image_url TEXT, published_at TEXT NOT NULL, ingested_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS news_perspectives (id TEXT PRIMARY KEY, article_id TEXT NOT NULL, provider TEXT NOT NULL, analysis_json TEXT NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (article_id) REFERENCES news_articles(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS marketplace_listings (id TEXT PRIMARY KEY, title TEXT NOT NULL, place TEXT NOT NULL, area TEXT NOT NULL, category TEXT NOT NULL, description TEXT NOT NULL, price_label TEXT, expires_at TEXT NOT NULL, verified INTEGER NOT NULL DEFAULT 0, metadata_json TEXT NOT NULL, created_at TEXT NOT NULL);
"""


class PostgresConnection:
    def __init__(self, connection: Any):
        self.connection = connection

    @staticmethod
    def _query(query: str) -> str:
        converted = query.replace("INSERT OR IGNORE INTO", "INSERT INTO")
        if "INSERT OR IGNORE INTO" in query and "ON CONFLICT" not in converted.upper():
            converted = converted.rstrip().rstrip(";") + " ON CONFLICT DO NOTHING"
        return converted.replace("?", "%s")

    def execute(self, query: str, params: tuple[Any, ...] = ()) -> Any:
        return self.connection.execute(self._query(query), params)


class Database:
    def __init__(self, path: Path, database_url: str | None = None):
        self.path = path
        self.database_url = database_url
        self.engine = "postgresql" if database_url else "sqlite"

    @contextmanager
    def connect(self) -> Iterator[Any]:
        if self.database_url:
            from psycopg import connect
            from psycopg.rows import dict_row

            connection = connect(self.database_url, row_factory=dict_row)
            try:
                yield PostgresConnection(connection)
                connection.commit()
            except Exception:
                connection.rollback()
                raise
            finally:
                connection.close()
            return

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
        if self.database_url:
            with self.connect() as db:
                row = db.execute("SELECT version FROM schema_migrations WHERE version = ?", ("0001_initial",)).fetchone()
                if not row:
                    raise RuntimeError("PostgreSQL migrations have not been applied")
            return
        with self.connect() as db:
            db.executescript(SQLITE_SCHEMA)

    @staticmethod
    def decode(row: Mapping[str, Any], *json_fields: str) -> dict[str, Any]:
        result = dict(row)
        for field in json_fields:
            result[field.removesuffix("_json")] = json.loads(result.pop(field))
        return result
