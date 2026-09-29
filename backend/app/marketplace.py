from __future__ import annotations

import json
from datetime import UTC, datetime, timedelta

from .database import Database


SEED_LISTINGS = [
    ("local-sourdough", "Sunday sourdough drop", "Starter Culture", "Indiranagar", "Food", "Small-batch loaves for Sunday pickup.", "Pre-order", 1),
    ("local-repair", "Same-day mixer repair", "Bharat Electricals", "Domlur", "Services", "Call before 4 PM for same-day assessment.", "Quote", 1),
    ("local-pottery", "Weekend pottery circle", "Soft Earth Studio", "Ulsoor", "Classes", "A small beginner-friendly weekend circle.", "4 seats", 0),
    ("local-open-mic", "Open mic under the trees", "Neighbourhood Library", "HAL 2nd Stage", "Events", "A community evening for music and spoken word.", "Free", 1),
    ("local-lunch", "Lunch bowl + lime soda", "Little Goa Canteen", "Indiranagar", "Offers", "Weekday lunch combination while stock lasts.", "₹199", 0),
    ("local-books", "Book swap: bring one, take one", "The Corner Shelf", "Jeevan Bhima Nagar", "Community", "A month-long neighbourhood book exchange.", "Free", 1),
]


def seed_listings(database: Database) -> None:
    now = datetime.now(UTC)
    expires = (now + timedelta(days=30)).isoformat()
    with database.connect() as db:
        for listing in SEED_LISTINGS:
            db.execute("INSERT OR IGNORE INTO marketplace_listings (id, title, place, area, category, description, price_label, expires_at, verified, metadata_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", (*listing[:7], expires, listing[7], json.dumps({"seed": True}), now.isoformat()))


def list_listings(database: Database, area: str | None = None, interests: list[str] | None = None, limit: int = 30) -> list[dict]:
    seed_listings(database)
    now = datetime.now(UTC).isoformat()
    with database.connect() as db:
        rows = db.execute("SELECT * FROM marketplace_listings WHERE expires_at > ? ORDER BY verified DESC, created_at DESC LIMIT ?", (now, min(max(limit, 1), 50))).fetchall()
    normalized_area = (area or "").strip().lower()
    interest_set = {item.strip().lower() for item in interests or [] if item.strip()}
    ranked = []
    for row in rows:
        item = Database.decode(row, "metadata_json")
        score = (3 if normalized_area and item["area"].lower() == normalized_area else 0) + (2 if interest_set and item["category"].lower() in interest_set else 0) + int(bool(item["verified"]))
        item["recommendation_score"] = score
        item["is_demo"] = bool(item["metadata"].get("seed"))
        ranked.append(item)
    return sorted(ranked, key=lambda item: (-item["recommendation_score"], item["title"]))
