from __future__ import annotations

import argparse
import os
import sqlite3
from pathlib import Path

import psycopg
from psycopg import sql

WEB_TABLES = ["users", "sessions", "auth_identities", "study_requests", "user_preferences", "saved_items", "contact_submissions", "community_posts", "user_roles"]
ROOM_TABLES = ["test_rooms", "test_attendees"]
API_TABLES = ["generated_papers", "generated_paper_cache", "paper_attempts", "paper_feedback", "news_articles", "news_perspectives", "marketplace_listings"]


def copy_database(source: Path, tables: list[str], target: psycopg.Connection) -> None:
    if not source.exists():
        print(f"Skip missing source: {source}")
        return
    source_db = sqlite3.connect(source)
    source_db.row_factory = sqlite3.Row
    try:
        available = {row[0] for row in source_db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        for table in tables:
            if table not in available:
                continue
            target_columns = {row[0] for row in target.execute("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=%s", (table,)).fetchall()}
            rows = source_db.execute(f'SELECT * FROM "{table}"').fetchall()
            inserted = 0
            orphaned = 0
            for row in rows:
                columns = [column for column in row.keys() if column in target_columns]
                statement = sql.SQL("INSERT INTO {} ({}) VALUES ({}) ON CONFLICT DO NOTHING").format(
                    sql.Identifier(table), sql.SQL(", ").join(map(sql.Identifier, columns)),
                    sql.SQL(", ").join(sql.Placeholder() for _ in columns),
                )
                try:
                    with target.transaction():
                        inserted += target.execute(statement, [row[column] for column in columns]).rowcount
                except psycopg.errors.ForeignKeyViolation:
                    orphaned += 1
            target.commit()
            already_present = len(rows) - inserted - orphaned
            print(f"{table}: {inserted} inserted, {already_present} already present, {orphaned} orphaned skipped")
    finally:
        source_db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="One-time local D1/SQLite to PostgreSQL copy")
    parser.add_argument("--web-sqlite", type=Path)
    parser.add_argument("--backend-sqlite", type=Path, default=Path("backend/data/papershapers.db"))
    args = parser.parse_args()
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL is required")
    with psycopg.connect(database_url) as target:
        if args.web_sqlite:
            copy_database(args.web_sqlite, WEB_TABLES, target)
        copy_database(args.backend_sqlite, API_TABLES, target)
        if args.web_sqlite:
            copy_database(args.web_sqlite, ROOM_TABLES, target)


if __name__ == "__main__":
    main()
