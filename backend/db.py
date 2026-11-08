"""SQLite storage + demo seed data. Stores only game state and event metadata (never message/page content)."""
from __future__ import annotations

import sqlite3
from datetime import date, timedelta
from pathlib import Path

DB_PATH = Path(__file__).parent / "hashling.db"

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  wallet INTEGER NOT NULL DEFAULT 0,
  streak INTEGER NOT NULL DEFAULT 0,
  last_quiz_day TEXT,
  day_offset INTEGER NOT NULL DEFAULT 0,
  mood TEXT NOT NULL DEFAULT 'happy',
  bonus_available INTEGER NOT NULL DEFAULT 0,
  bonus_category TEXT
);
CREATE TABLE IF NOT EXISTS inventory (
  user_id TEXT NOT NULL,
  item_id TEXT NOT NULL,
  equipped INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, item_id)
);
CREATE TABLE IF NOT EXISTS quiz_attempts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  day TEXT NOT NULL,
  question_id TEXT NOT NULL,
  kind TEXT NOT NULL DEFAULT 'daily',
  correct INTEGER NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  risk TEXT,
  category TEXT,
  domain TEXT,
  day TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""

FREE_ITEMS = ["fur_classic", "bg_greenhouse"]

# id, name, lifetime, wallet, streak, owned items, equipped items, recent heeded events (days ago, category, domain)
SEED = [
    {"id": "maya", "name": "Maya", "lifetime": 0, "wallet": 0, "streak": 0, "played_yesterday": False,
     "owned": [], "equipped": [], "events": []},
    {"id": "jordan", "name": "Jordan", "lifetime": 60, "wallet": 60, "streak": 3, "played_yesterday": True,
     "owned": [], "equipped": [], "events": [(1, "package_delivery", "swiftship-redelivery.top")]},
    {"id": "priya", "name": "Priya", "lifetime": 165, "wallet": 125, "streak": 9, "played_yesterday": True,
     "owned": [], "equipped": [], "events": [(2, "toll_fee", "metrotoll-pay.icu"), (4, "bank_impersonation", "northbridge-secure.icu")]},
    {"id": "sam", "name": "Sam", "lifetime": 420, "wallet": 180, "streak": 21, "played_yesterday": True,
     "owned": ["hat_sprout", "collar_led", "acc_shield", "fur_amber", "bg_rooftop"],
     "equipped": ["hat_sprout", "collar_led"],  # background: the default greenhouse (Rooftop stays owned, equip it in the shop)
     "events": [(0, "prize_giveaway", "megamart-rewards.club"), (1, "account_verification", "cloudnest.mail-upgrade.top"),
                (3, "toll_fee", "metrotoll-pay.icu"), (5, "package_delivery", "swiftship.parcel-release.cc")]},
]


def connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init(conn: sqlite3.Connection) -> None:
    conn.executescript(SCHEMA)
    have = {r["id"] for r in conn.execute("SELECT id FROM users")}
    for s in SEED:
        if s["id"] not in have:
            seed_user(conn, s["id"])
    conn.commit()


def seed_user(conn: sqlite3.Connection, user_id: str) -> None:
    s = next(x for x in SEED if x["id"] == user_id)
    today = date.today()
    conn.execute("DELETE FROM users WHERE id=?", (user_id,))
    conn.execute("DELETE FROM inventory WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM quiz_attempts WHERE user_id=?", (user_id,))
    conn.execute("DELETE FROM events WHERE user_id=?", (user_id,))
    last = (today - timedelta(days=1)).isoformat() if s["played_yesterday"] else None
    conn.execute(
        "INSERT INTO users (id, name, lifetime_points, wallet, streak, last_quiz_day, day_offset, mood, bonus_available) "
        "VALUES (?,?,?,?,?,?,0,'happy',0)",
        (s["id"], s["name"], s["lifetime"], s["wallet"], s["streak"], last))
    equipped = set(s["equipped"])
    slots_equipped = {i.split("_")[0] for i in equipped}
    for item in FREE_ITEMS + s["owned"]:
        eq = item in equipped or (item == "fur_classic" and "fur" not in slots_equipped) or (item == "bg_greenhouse" and "bg" not in slots_equipped)
        conn.execute("INSERT OR IGNORE INTO inventory (user_id, item_id, equipped) VALUES (?,?,?)", (user_id, item, int(eq)))
    for days_ago, cat, dom in s["events"]:
        d = (today - timedelta(days=days_ago)).isoformat()
        conn.execute("INSERT INTO events (user_id, type, risk, category, domain, day) VALUES (?,?,?,?,?,?)",
                     (user_id, "warning_shown", "red", cat, dom, d))
        conn.execute("INSERT INTO events (user_id, type, risk, category, domain, day) VALUES (?,?,?,?,?,?)",
                     (user_id, "warning_heeded", "red", cat, dom, d))
    conn.commit()
