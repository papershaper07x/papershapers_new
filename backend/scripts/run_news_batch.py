from __future__ import annotations

import argparse
from pathlib import Path

from backend.app.config import Settings
from backend.app.database import Database
from backend.app.news import ingest_feeds, ingest_fixture


def main() -> None:
    parser = argparse.ArgumentParser(description="Ingest news into the local Paper Shapers SQLite store.")
    parser.add_argument("--fixture", action="store_true", help="Use the committed illustrative fixture instead of the network.")
    parser.add_argument("--feed", action="append", default=[], help="RSS feed URL; may be supplied more than once.")
    args = parser.parse_args()
    settings = Settings.from_env()
    database = Database(settings.db_path)
    database.initialize()
    feeds = args.feed or list(settings.news_rss_feeds)
    fixture = Path(__file__).parents[1] / "fixtures" / "news.json"
    count = ingest_fixture(database, fixture) if args.fixture or not feeds else ingest_feeds(database, feeds)
    print(f"News batch complete: inserted={count}, mode={'fixture' if args.fixture or not feeds else 'rss'}")


if __name__ == "__main__":
    main()
