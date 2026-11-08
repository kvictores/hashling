"""Points, growth, streaks, quiz, shop and protection events."""
from __future__ import annotations

import json
import random
import sqlite3
from datetime import date, timedelta
from pathlib import Path

from fastapi import HTTPException

DATA = Path(__file__).parent / "data"
QUESTIONS: list[dict] = json.loads((DATA / "questions.json").read_text(encoding="utf-8"))
BONUS: list[dict] = json.loads((DATA / "bonus_questions.json").read_text(encoding="utf-8"))
SHOP: list[dict] = json.loads((DATA / "shop.json").read_text(encoding="utf-8"))
SHOP_BY_ID = {i["id"]: i for i in SHOP}
Q_BY_ID = {q["id"]: q for q in QUESTIONS + BONUS}

STAGES = [("egg", 0), ("kitten", 30), ("cub", 100), ("adult", 250)]
CORRECT_PTS, ALL_CORRECT_BONUS, STREAK_PER_DAY, STREAK_CAP = 10, 15, 2, 20
HEED_PTS, HEED_MAX_PER_DAY, BONUS_Q_PTS = 5, 3, 10
DEFAULTS = {"fur": "fur_classic", "background": "bg_greenhouse"}
EPOCH = date(2026, 1, 1)


# --------------------------------------------------------------------------- basics

def stage_for(lifetime: int) -> str:
    s = "egg"
    for name, threshold in STAGES:
        if lifetime >= threshold:
            s = name
    return s


def user_today(u: sqlite3.Row) -> date:
    return date.today() + timedelta(days=u["day_offset"])


def get_row(conn, user_id: str) -> sqlite3.Row:
    u = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    if not u:
        raise HTTPException(404, "Unknown user")
    # streak breaks if a whole day was missed
    if u["last_quiz_day"] and u["streak"] > 0:
        last = date.fromisoformat(u["last_quiz_day"])
        if (user_today(u) - last).days > 1:
            conn.execute("UPDATE users SET streak=0 WHERE id=?", (user_id,))
            conn.commit()
            u = conn.execute("SELECT * FROM users WHERE id=?", (user_id,)).fetchone()
    return u


def equipped(conn, user_id: str) -> dict:
    eq = {}
    for r in conn.execute("SELECT item_id FROM inventory WHERE user_id=? AND equipped=1", (user_id,)):
        item = SHOP_BY_ID.get(r["item_id"])
        if item:
            eq[item["slot"]] = item["id"]
    for slot, d in DEFAULTS.items():
        eq.setdefault(slot, d)
    return eq


def daily_questions(day: date) -> list[dict]:
    idx = day.toordinal() % 7
    order = {"multiple_choice": 0, "true_false": 1, "spot_the_phish": 2}
    return sorted([q for q in QUESTIONS if q["day"] == idx], key=lambda q: order[q["type"]])


def daily_attempts(conn, user_id: str, day: date) -> list[sqlite3.Row]:
    return conn.execute("SELECT * FROM quiz_attempts WHERE user_id=? AND day=? AND kind='daily' ORDER BY id",
                        (user_id, day.isoformat())).fetchall()


def user_public(conn, user_id: str) -> dict:
    u = get_row(conn, user_id)
    today = user_today(u)
    lt = u["lifetime_points"]
    stage = stage_for(lt)
    idx = [s for s, _ in STAGES].index(stage)
    nxt = STAGES[idx + 1] if idx + 1 < len(STAGES) else None
    cur_t = STAGES[idx][1]
    progress = 1.0 if not nxt else (lt - cur_t) / (nxt[1] - cur_t)
    week_ago = (today - timedelta(days=6)).isoformat()
    ev = lambda typ, since: conn.execute(
        "SELECT COUNT(*) FROM events WHERE user_id=? AND type=? AND day>=? AND day<=?",
        (user_id, typ, since, today.isoformat())).fetchone()[0]
    attempts = daily_attempts(conn, user_id, today)
    return {
        "id": u["id"], "name": u["name"],
        "lifetime_points": lt, "wallet": u["wallet"], "streak": u["streak"],
        "stage": stage, "next_stage": nxt[0] if nxt else None, "next_threshold": nxt[1] if nxt else None,
        "stage_threshold": cur_t, "progress": round(max(0.0, min(1.0, progress)), 3),
        "mood": u["mood"], "today": today.isoformat(), "day_offset": u["day_offset"],
        "quiz_answered_today": len(attempts), "quiz_done_today": len(attempts) >= 3,
        "bonus_available": u["bonus_available"], "bonus_category": u["bonus_category"],
        "shop_unlocked": stage == "adult",
        "equipped": equipped(conn, user_id),
        "stats": {
            "threats_blocked_week": ev("warning_heeded", week_ago),
            "warnings_week": ev("warning_shown", week_ago),
            "blocked_today": ev("warning_heeded", today.isoformat()),
            "warnings_today": ev("warning_shown", today.isoformat()),
            "ignored_week": ev("warning_ignored", week_ago),
        },
    }


def add_points(conn, user_id: str, pts: int) -> None:
    if pts:
        conn.execute("UPDATE users SET lifetime_points=lifetime_points+?, wallet=wallet+? WHERE id=?", (pts, pts, user_id))


# --------------------------------------------------------------------------- quiz

def public_question(q: dict) -> dict:
    out = {k: v for k, v in q.items() if k not in ("answer", "explanation")}
    if q["type"] == "spot_the_phish":
        out["regions"] = [{"id": r["id"], "part": r["part"], "text": r["text"]} for r in q["regions"]]
        out["required_count"] = sum(1 for r in q["regions"] if r.get("required"))
    return out


def reveal(q: dict) -> dict:
    if q["type"] == "spot_the_phish":
        return {"regions": [{"id": r["id"], "flag": r["flag"], "required": bool(r.get("required")), "why": r["why"]} for r in q["regions"]]}
    return {"answer": q["answer"]}


def check(q: dict, answer) -> bool:
    if q["type"] == "multiple_choice":
        return isinstance(answer, int) and answer == q["answer"]
    if q["type"] == "true_false":
        return isinstance(answer, bool) and answer == q["answer"]
    if q["type"] == "spot_the_phish":
        sel = set(answer or [])
        required = {r["id"] for r in q["regions"] if r.get("required")}
        safe = {r["id"] for r in q["regions"] if not r["flag"]}
        return required <= sel and not (sel & safe)
    return False


def share_line(day: date, results: list[bool], streak: int) -> str:
    n = (day - EPOCH).days + 1
    grid = "".join("🟩" if c else "🟥" for c in results)
    return f"Hashling Daily #{n} {grid} 🔥{streak} — I'm getting scam-smart with my cyber-pet!"


def quiz_today(conn, user_id: str) -> dict:
    u = get_row(conn, user_id)
    today = user_today(u)
    qs = daily_questions(today)
    attempts = {a["question_id"]: a for a in daily_attempts(conn, user_id, today)}
    done = len(attempts) >= 3
    results = [bool(attempts[q["id"]]["correct"]) for q in qs if q["id"] in attempts]
    return {
        "day": today.isoformat(), "day_number": (today - EPOCH).days + 1,
        "questions": [public_question(q) | {"answered": q["id"] in attempts,
                                             "correct": bool(attempts[q["id"]]["correct"]) if q["id"] in attempts else None,
                                             **({"reveal": reveal(q), "explanation": q["explanation"]} if q["id"] in attempts else {})}
                      for q in qs],
        "completed": done, "results": results,
        "share": share_line(today, results, u["streak"]) if done else None,
    }


def answer(conn, user_id: str, question_id: str, ans, kind: str = "daily") -> dict:
    u = get_row(conn, user_id)
    today = user_today(u)
    q = Q_BY_ID.get(question_id)
    if not q:
        raise HTTPException(404, "Unknown question")
    before_stage = stage_for(u["lifetime_points"])
    breakdown = []
    correct = check(q, ans)
    completed = False

    if kind == "bonus":
        if u["bonus_available"] <= 0:
            raise HTTPException(400, "No bonus question available")
        if q not in BONUS:
            raise HTTPException(400, "Not a bonus question")
        pts = BONUS_Q_PTS if correct else 0
        if pts:
            breakdown.append({"label": "Bonus question", "points": pts})
        conn.execute("UPDATE users SET bonus_available=bonus_available-1, bonus_category=NULL WHERE id=?", (user_id,))
        conn.execute("INSERT INTO quiz_attempts (user_id, day, question_id, kind, correct, points) VALUES (?,?,?,?,?,?)",
                     (user_id, today.isoformat(), question_id, "bonus", int(correct), pts))
        add_points(conn, user_id, pts)
    else:
        qs = daily_questions(today)
        if q["id"] not in {x["id"] for x in qs}:
            raise HTTPException(400, "That isn't one of today's questions")
        prev = daily_attempts(conn, user_id, today)
        if any(a["question_id"] == question_id for a in prev):
            raise HTTPException(409, "Already answered")
        pts = CORRECT_PTS if correct else 0
        if pts:
            breakdown.append({"label": "Correct answer", "points": pts})
        conn.execute("INSERT INTO quiz_attempts (user_id, day, question_id, kind, correct, points) VALUES (?,?,?,?,?,?)",
                     (user_id, today.isoformat(), question_id, "daily", int(correct), pts))
        total = pts
        if len(prev) + 1 >= 3:
            completed = True
            all_correct = all(a["correct"] for a in prev) and correct
            last = date.fromisoformat(u["last_quiz_day"]) if u["last_quiz_day"] else None
            new_streak = u["streak"] + 1 if last and (today - last).days == 1 else 1
            conn.execute("UPDATE users SET streak=?, last_quiz_day=?, mood='happy' WHERE id=?",
                         (new_streak, today.isoformat(), user_id))
            if all_correct:
                breakdown.append({"label": "Perfect day (3/3)", "points": ALL_CORRECT_BONUS})
                total += ALL_CORRECT_BONUS
            sb = min(STREAK_PER_DAY * new_streak, STREAK_CAP)
            breakdown.append({"label": f"Streak bonus (🔥{new_streak})", "points": sb})
            total += sb
        add_points(conn, user_id, total)
    conn.commit()

    after = user_public(conn, user_id)
    return {
        "correct": correct,
        "reveal": reveal(q),
        "explanation": q["explanation"],
        "points_awarded": sum(b["points"] for b in breakdown),
        "breakdown": breakdown,
        "completed": completed,
        "share": quiz_today(conn, user_id)["share"] if completed else None,
        "stage_up": {"from": before_stage, "to": after["stage"]} if after["stage"] != before_stage else None,
        "user": after,
    }


def bonus_question(conn, user_id: str, category: str | None) -> dict:
    u = get_row(conn, user_id)
    if u["bonus_available"] <= 0:
        return {"available": False}
    cat = category or u["bonus_category"]
    pool = [q for q in BONUS if q["scam_category"] == cat] or BONUS
    q = random.choice(pool)
    return {"available": True, "question": public_question(q)}


# --------------------------------------------------------------------------- shop

def shop(conn, user_id: str | None) -> dict:
    owned, eq, unlocked = {}, {}, False
    if user_id:
        pub = user_public(conn, user_id)
        unlocked, eq = pub["shop_unlocked"], pub["equipped"]
        owned = {r["item_id"] for r in conn.execute("SELECT item_id FROM inventory WHERE user_id=?", (user_id,))}
    items = [i | {"owned": i["id"] in owned or i["price"] == 0, "equipped": eq.get(i["slot"]) == i["id"]} for i in SHOP]
    return {"unlocked": unlocked, "items": items, "equipped": eq}


def buy(conn, user_id: str, item_id: str) -> dict:
    pub = user_public(conn, user_id)
    item = SHOP_BY_ID.get(item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    if not pub["shop_unlocked"]:
        raise HTTPException(403, "Grow Hashling to unlock the shop")
    if conn.execute("SELECT 1 FROM inventory WHERE user_id=? AND item_id=?", (user_id, item_id)).fetchone():
        raise HTTPException(409, "Already owned")
    if pub["wallet"] < item["price"]:
        raise HTTPException(400, "Not enough points")
    conn.execute("UPDATE users SET wallet=wallet-? WHERE id=?", (item["price"], user_id))
    conn.execute("INSERT INTO inventory (user_id, item_id, equipped) VALUES (?,?,0)", (user_id, item_id))
    conn.commit()
    return equip(conn, user_id, item_id, True)


def equip(conn, user_id: str, item_id: str, on: bool) -> dict:
    item = SHOP_BY_ID.get(item_id)
    if not item:
        raise HTTPException(404, "Unknown item")
    if item["price"] > 0 and not conn.execute("SELECT 1 FROM inventory WHERE user_id=? AND item_id=?", (user_id, item_id)).fetchone():
        raise HTTPException(403, "You don't own that item")
    conn.execute("INSERT OR IGNORE INTO inventory (user_id, item_id, equipped) VALUES (?,?,0)", (user_id, item_id))
    same_slot = [i["id"] for i in SHOP if i["slot"] == item["slot"]]
    conn.execute(f"UPDATE inventory SET equipped=0 WHERE user_id=? AND item_id IN ({','.join('?' * len(same_slot))})",
                 (user_id, *same_slot))
    if on:
        conn.execute("UPDATE inventory SET equipped=1 WHERE user_id=? AND item_id=?", (user_id, item_id))
    conn.commit()
    return {"user": user_public(conn, user_id), "shop": shop(conn, user_id)}


# --------------------------------------------------------------------------- protection events

def record_event(conn, user_id: str, typ: str, risk: str | None, category: str | None, domain: str | None) -> dict:
    if typ not in ("warning_shown", "warning_heeded", "warning_ignored"):
        raise HTTPException(400, "Bad event type")
    u = get_row(conn, user_id)
    today = user_today(u).isoformat()
    pts = 0
    if typ == "warning_heeded":
        n = conn.execute("SELECT COUNT(*) FROM events WHERE user_id=? AND type='warning_heeded' AND day=?",
                         (user_id, today)).fetchone()[0]
        if n < HEED_MAX_PER_DAY:
            pts = HEED_PTS
        conn.execute("UPDATE users SET mood='happy', bonus_available=MIN(bonus_available+1, 3), bonus_category=? WHERE id=?",
                     (category, user_id))
    elif typ == "warning_ignored" and risk == "red":
        conn.execute("UPDATE users SET mood='sad' WHERE id=?", (user_id,))
    # metadata only: type, risk, category, domain (never content)
    conn.execute("INSERT INTO events (user_id, type, risk, category, domain, day) VALUES (?,?,?,?,?,?)",
                 (user_id, typ, risk, category, (domain or "")[:253], today))
    before = stage_for(u["lifetime_points"])
    add_points(conn, user_id, pts)
    conn.commit()
    after = user_public(conn, user_id)
    return {"points_awarded": pts, "user": after,
            "stage_up": {"from": before, "to": after["stage"]} if after["stage"] != before else None}


def demo_points(conn, user_id: str, amount: int = 50) -> dict:
    u = get_row(conn, user_id)
    before = stage_for(u["lifetime_points"])
    add_points(conn, user_id, amount)
    conn.commit()
    after = user_public(conn, user_id)
    return {"user": after, "stage_up": {"from": before, "to": after["stage"]} if after["stage"] != before else None}


def demo_next_day(conn, user_id: str) -> dict:
    get_row(conn, user_id)
    conn.execute("UPDATE users SET day_offset=day_offset+1 WHERE id=?", (user_id,))
    conn.commit()
    return {"user": user_public(conn, user_id)}
