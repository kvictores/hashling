"""Hashling backend. Run: uvicorn main:app --reload --port 8000"""
from __future__ import annotations

import json
import os
import re
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

from fastapi import Depends, FastAPI, HTTPException  # noqa: E402
from fastapi.middleware.cors import CORSMiddleware  # noqa: E402
from pydantic import BaseModel, Field  # noqa: E402

import db  # noqa: E402
import engine  # noqa: E402
import game  # noqa: E402
import hashcheck  # noqa: E402

app = FastAPI(title="Hashling API", version="1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_origin_regex=r"chrome-extension://.*",
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

with db.connect() as _c:
    db.init(_c)


def get_conn():
    conn = db.connect()
    try:
        yield conn
    finally:
        conn.close()


# --------------------------------------------------------------------------- models

class UrlIn(BaseModel):
    url: str
    page_signals: dict[str, Any] | None = None


class TextIn(BaseModel):
    text: str = Field(max_length=20000)
    channel: Literal["sms", "email"] = "sms"
    sender: str = ""
    subject: str = ""


class EmailIn(BaseModel):
    sender: str = ""
    subject: str = ""
    body: str = Field("", max_length=50000)
    links: list[str] = []


class HashIn(BaseModel):
    sha256: str


class AnswerIn(BaseModel):
    user_id: str
    question_id: str
    answer: Any = None
    kind: Literal["daily", "bonus"] = "daily"


class ShopIn(BaseModel):
    user_id: str
    item_id: str
    equip: bool = True


class EventIn(BaseModel):
    user_id: str
    type: Literal["warning_shown", "warning_heeded", "warning_ignored"]
    risk: str | None = None
    category: str | None = None
    domain: str | None = None


class PointsIn(BaseModel):
    amount: int = 50


# --------------------------------------------------------------------------- routes

@app.get("/")
def root():
    return {"name": "Hashling API", "ok": True, "gemini": engine.llm.available(), "virustotal": hashcheck.vt_available()}


@app.post("/analyze/url")
def analyze_url(body: UrlIn):
    return engine.analyze_url(body.url, body.page_signals)


@app.post("/analyze/text")
def analyze_text(body: TextIn):
    return engine.analyze_text(body.text, body.channel, body.sender, body.subject)


@app.post("/analyze/email")
def analyze_email(body: EmailIn):
    return engine.analyze_email(body.sender, body.subject, body.body, body.links[:50])


@app.post("/hash/check")
def hash_check(body: HashIn):
    h = body.sha256.strip().lower()
    if not re.fullmatch(r"[0-9a-f]{64}", h):
        raise HTTPException(400, "Expected a 64-character hex SHA-256")
    return hashcheck.check(h)


@app.get("/users")
def users(conn=Depends(get_conn)):
    return [game.user_public(conn, r["id"]) for r in conn.execute("SELECT id FROM users ORDER BY lifetime_points")]


@app.get("/users/{user_id}")
def user(user_id: str, conn=Depends(get_conn)):
    return game.user_public(conn, user_id)


@app.post("/users/{user_id}/reset")
def reset(user_id: str, conn=Depends(get_conn)):
    if user_id not in {s["id"] for s in db.SEED}:
        raise HTTPException(404, "Unknown user")
    db.seed_user(conn, user_id)
    return {"user": game.user_public(conn, user_id)}


@app.post("/users/{user_id}/demo/points")
def demo_points(user_id: str, body: PointsIn | None = None, conn=Depends(get_conn)):
    return game.demo_points(conn, user_id, (body.amount if body else 50))


@app.post("/users/{user_id}/demo/next-day")
def demo_next_day(user_id: str, conn=Depends(get_conn)):
    return game.demo_next_day(conn, user_id)


@app.get("/quiz/today")
def quiz_today(user_id: str, conn=Depends(get_conn)):
    return game.quiz_today(conn, user_id)


@app.get("/quiz/bonus")
def quiz_bonus(user_id: str, category: str | None = None, conn=Depends(get_conn)):
    return game.bonus_question(conn, user_id, category)


@app.post("/quiz/answer")
def quiz_answer(body: AnswerIn, conn=Depends(get_conn)):
    return game.answer(conn, body.user_id, body.question_id, body.answer, body.kind)


@app.get("/shop")
def shop(user_id: str | None = None, conn=Depends(get_conn)):
    return game.shop(conn, user_id)


@app.post("/shop/buy")
def shop_buy(body: ShopIn, conn=Depends(get_conn)):
    return game.buy(conn, body.user_id, body.item_id)


@app.post("/shop/equip")
def shop_equip(body: ShopIn, conn=Depends(get_conn)):
    return game.equip(conn, body.user_id, body.item_id, body.equip)


@app.post("/events")
def events(body: EventIn, conn=Depends(get_conn)):
    return game.record_event(conn, body.user_id, body.type, body.risk, body.category, body.domain)


@app.post("/privacy/redact-preview")
def redact_preview(body: TextIn):
    """Shows exactly what WOULD be sent to the LLM for this text (nothing is sent by this endpoint)."""
    import llm
    payload = {"kind": body.channel, "sender": body.sender, "subject": body.subject, "text": body.text}
    return {"llm_enabled": llm.available(), "model": llm.model(), "prompt": llm.build_prompt(payload, 0, ["(heuristic findings go here)"])}


@app.get("/taxonomy")
def taxonomy():
    return engine.TAXONOMY


@app.get("/eval")
def eval_results():
    p = Path(__file__).parent / "eval_results.md"
    j = Path(__file__).parent / "eval_results.json"
    return {"markdown": p.read_text(encoding="utf-8") if p.exists() else None,
            "summary": json.loads(j.read_text(encoding="utf-8")) if j.exists() else None}
