"""Detection pipeline: heuristics -> (optional) LLM refinement -> unified output format."""
from __future__ import annotations

import json
from pathlib import Path

import heuristics as H
import llm

DATA = Path(__file__).parent / "data"
TAXONOMY: dict = json.loads((DATA / "taxonomy.json").read_text(encoding="utf-8"))

SAFE_MAX, YELLOW_MAX = 30, 65  # safe < 30, yellow 30-64, red >= 65


def risk_level(score: int) -> str:
    return "safe" if score < SAFE_MAX else ("yellow" if score < YELLOW_MAX else "red")


def confidence_for(score: int, n_reasons: int, has_links: bool) -> float:
    d = min(abs(score - SAFE_MAX), abs(score - YELLOW_MAX))
    c = 0.5 + min(0.33, d / 80) + 0.03 * min(n_reasons, 3)
    if score < SAFE_MAX and not has_links:
        c = min(c, 0.78)  # wording-only "safe" verdicts deserve humility
    return round(min(c, 0.95), 2)


def uncertainty_for(risk: str, has_links: bool, brand: str | None, channel: str, engine: str) -> str:
    who = f"the real {H.BRAND_DISPLAY[brand]}" if brand else "who they claim to be"
    if risk == "red":
        line = f"We can't confirm the sender, but this closely matches known scam patterns. It's very unlikely to be {who}."
    elif risk == "yellow":
        line = f"Some signals are suspicious, but this could still be legitimate. We can't verify whether this is really from {who}."
    else:
        line = "No strong scam signals, but we can't verify the sender. If it later asks for money, codes or logins, double-check."
    if not has_links and channel in ("sms", "email"):
        line += " There were no links to check, so this is based on wording only."
    if engine == "heuristic":
        line += " (Local heuristics only; no AI review.)"
    return line


def next_steps_for(category: str, channel: str, risk: str) -> list[str]:
    steps = list(TAXONOMY.get(category, TAXONOMY["legitimate"])["next_steps"])
    if risk == "safe":
        return TAXONOMY["legitimate"]["next_steps"]
    if channel == "email":
        steps = [s.replace("Forward the text to 7726 (SPAM), then delete it", "Report it as phishing in your email app, then delete it")
                  .replace("Forward the text to 7726 (SPAM)", "Report it as phishing in your email app") for s in steps]
    elif channel == "web":
        steps = [s.replace("Don't tap the link", "Leave this page; don't enter any details")
                  .replace("Forward the text to 7726 (SPAM), then delete it", "Close the tab")
                  .replace("Forward the text to 7726 (SPAM)", "Close the tab") for s in steps]
    return steps


def finalize(r: H.Result, channel: str, llm_input: dict | None) -> dict:
    score, category, reasons = r.score, r.category, r.reasons[:6]
    engine = "heuristic"
    conf = confidence_for(score, len(reasons), r.has_links)

    if score >= SAFE_MAX and llm_input is not None and llm.available():
        out = llm.refine(llm_input, heuristic_score=score, heuristic_reasons=reasons)
        if out:
            engine = "heuristic+gemini"
            lconf = float(out.get("confidence", 0.5))
            lscore = int(out.get("score", score))
            score = max(score, lscore) if lconf >= 0.75 else round((score + lscore) / 2)
            if out.get("category") in TAXONOMY and out.get("category") != "legitimate" and score >= SAFE_MAX:
                category = out["category"]
            extra = [x for x in out.get("reasons", []) if isinstance(x, str)]
            reasons = (reasons[:4] + [f"AI review: {x}" for x in extra[:2]])
            conf = round(min(0.97, (conf + lconf) / 2 + 0.05), 2)

    risk = risk_level(score)
    if risk == "safe":
        category = "legitimate"
    elif category == "legitimate":
        category = "account_verification"
    return {
        "risk": risk,
        "score": int(score),
        "category": category,
        "category_label": TAXONOMY[category]["label"],
        "confidence": conf,
        "reasons": reasons if reasons else ["No common scam signals found"],
        "uncertainty": uncertainty_for(risk, r.has_links, r.brand, channel, engine),
        "next_steps": next_steps_for(category, channel, risk),
        "engine": engine,
    }


def analyze_text(text: str, channel: str = "sms", sender: str = "", subject: str = "") -> dict:
    r = H.analyze_text_core(text, channel, sender, subject)
    return finalize(r, channel, {"kind": channel, "sender": sender, "subject": subject, "text": text})


def analyze_email(sender: str, subject: str, body: str, links: list[str]) -> dict:
    r = H.analyze_text_core(body, "email", sender, subject, links)
    return finalize(r, "email", {"kind": "email", "sender": sender, "subject": subject, "text": body, "links": links})


def analyze_url(url: str, page_signals: dict | None) -> dict:
    r = H.analyze_page(url, page_signals)
    ps = page_signals or {}
    return finalize(r, "web", {"kind": "web page", "url": url, "title": ps.get("title", ""), "text": ps.get("text") or ps.get("snippet") or ""})
