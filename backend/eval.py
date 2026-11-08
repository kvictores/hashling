"""Evaluate Hashling's detection engine against our synthetic datasets.

    python eval.py            # uses Gemini only if GEMINI_API_KEY is set
    python eval.py --no-llm   # heuristics only

Compares the hybrid engine with a deliberately simple keyword-only baseline (flag if any urgency/payment word
appears). Writes eval_results.md (human-readable) and eval_results.json (read by the web About page).

Honesty note: synthetic_messages.json was written by us while building the rules, so its score is optimistic.
holdout_messages.json was written after the rules were frozen and was NOT used for tuning.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

HERE = Path(__file__).parent
if "--no-llm" in sys.argv:
    os.environ.pop("GEMINI_API_KEY", None)
else:
    from dotenv import load_dotenv
    load_dotenv(HERE / ".env")

import engine  # noqa: E402

BASELINE_WORDS = ["urgent", "immediately", "now", "today", "final notice", "suspended", "expire", "act fast", "verify",
                  "gift card", "bitcoin", "crypto", "wire", "pay", "payment", "fee", "prize", "won", "winner"]


def baseline(m: dict) -> str:
    t = (m.get("subject", "") + " " + m["text"]).lower()
    return "scam" if any(w in t for w in BASELINE_WORDS) else "legitimate"


def hybrid(m: dict) -> tuple[str, dict]:
    if m["channel"] == "email":
        r = engine.analyze_email(m.get("sender", ""), m.get("subject", ""), m["text"], [])
    else:
        r = engine.analyze_text(m["text"], "sms", m.get("sender", ""))
    return ("scam" if r["risk"] != "safe" else "legitimate"), r


def metrics(pairs: list[tuple[str, str]]) -> dict:
    tp = sum(1 for y, p in pairs if y == "scam" and p == "scam")
    fp = sum(1 for y, p in pairs if y != "scam" and p == "scam")
    tn = sum(1 for y, p in pairs if y != "scam" and p != "scam")
    fn = sum(1 for y, p in pairs if y == "scam" and p != "scam")
    n = len(pairs) or 1
    prec = tp / (tp + fp) if tp + fp else 0.0
    rec = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * prec * rec / (prec + rec) if prec + rec else 0.0
    return {"accuracy": round((tp + tn) / n, 3), "precision": round(prec, 3), "recall": round(rec, 3), "f1": round(f1, 3),
            "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn}}


def run(path: Path) -> dict:
    msgs = json.loads(path.read_text(encoding="utf-8"))
    h_pairs, b_pairs, misses, cat_ok, scams, engines, red, yellow = [], [], [], 0, 0, set(), 0, 0
    for m in msgs:
        pred, r = hybrid(m)
        engines.add(r["engine"])
        h_pairs.append((m["label"], pred))
        b_pairs.append((m["label"], baseline(m)))
        if m["label"] == "scam":
            scams += 1
            cat_ok += r["category"] == m["category"]
            red += r["risk"] == "red"
            yellow += r["risk"] == "yellow"
        if pred != m["label"]:
            misses.append({"id": m["id"], "label": m["label"], "risk": r["risk"], "score": r["score"], "text": m["text"][:90]})
    return {"size": len(msgs), "hybrid": metrics(h_pairs), "baseline": metrics(b_pairs), "misses": misses,
            "category_accuracy": round(cat_ok / scams, 3) if scams else None, "engines": sorted(engines),
            "scam_red": red, "scam_yellow": yellow, "scams": scams}


def table(name: str, res: dict) -> str:
    h, b = res["hybrid"], res["baseline"]
    lines = [f"### {name} ({res['size']} messages)", "",
             "| Metric | Hashling hybrid | Keyword baseline |", "|---|---|---|"]
    for k in ("accuracy", "precision", "recall", "f1"):
        lines.append(f"| {k.capitalize()} | **{h[k]:.3f}** | {b[k]:.3f} |")
    lines += ["", "Confusion matrix (positive = scam):", "",
              "| | Predicted scam | Predicted legitimate |", "|---|---|---|",
              f"| **Actual scam** | {h['confusion']['tp']} (baseline {b['confusion']['tp']}) | {h['confusion']['fn']} (baseline {b['confusion']['fn']}) |",
              f"| **Actual legitimate** | {h['confusion']['fp']} (baseline {b['confusion']['fp']}) | {h['confusion']['tn']} (baseline {b['confusion']['tn']}) |",
              "", f"Scam category correctly identified: **{res['category_accuracy']:.0%}** of scams. "
              f"Scams rated red: {res['scam_red']}/{res['scams']}, yellow: {res['scam_yellow']}/{res['scams']}.", ""]
    if res["misses"]:
        lines.append("Misclassified by Hashling:")
        lines += [f"- `{x['id']}` {x['label']} → {x['risk']} (score {x['score']}): {x['text']}…" for x in res["misses"]]
    else:
        lines.append("Misclassified by Hashling: none.")
    return "\n".join(lines) + "\n"


def main():
    main_res = run(HERE / "data" / "synthetic_messages.json")
    hold = HERE / "data" / "holdout_messages.json"
    hold_res = run(hold) if hold.exists() else None
    now = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    eng = ", ".join(sorted(set(main_res["engines"]) | set(hold_res["engines"] if hold_res else [])))

    md = [f"# Hashling detection accuracy", "", f"Generated {now} · engine: `{eng}` · threshold: risk ≥ yellow (score ≥ 30) counts as “scam”.", "",
          "Baseline = flag a message if it contains any urgency/payment keyword "
          f"({', '.join(BASELINE_WORDS)}).", "",
          "> **Read with care.** All data is synthetic and written by our team. The main set was written while we built "
          "the rules, so its score is optimistic. The held-out set was written after the rules were frozen and never used "
          "for tuning; treat it as the more honest number. Neither set is a substitute for real-world testing.", "",
          table("Main set: synthetic_messages.json", main_res)]
    if hold_res:
        md.append(table("Held-out set: holdout_messages.json", hold_res))
    (HERE / "eval_results.md").write_text("\n".join(md), encoding="utf-8")

    summary = {"dataset_size": main_res["size"], "hybrid": main_res["hybrid"], "baseline": main_res["baseline"],
               "category_accuracy": main_res["category_accuracy"], "engine": eng, "generated_at": now}
    if hold_res:
        summary["holdout"] = {"size": hold_res["size"], "hybrid": hold_res["hybrid"], "baseline": hold_res["baseline"],
                              "category_accuracy": hold_res["category_accuracy"], "misses": len(hold_res["misses"])}
    (HERE / "eval_results.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")

    for name, r in [("MAIN", main_res), ("HOLDOUT", hold_res)]:
        if not r:
            continue
        h, b = r["hybrid"], r["baseline"]
        print(f"\n{name} ({r['size']} msgs)            hybrid   baseline")
        for k in ("accuracy", "precision", "recall", "f1"):
            print(f"  {k:<10}                {h[k]:.3f}    {b[k]:.3f}")
        c = h["confusion"]
        print(f"  confusion (hybrid)  TP={c['tp']} FP={c['fp']} TN={c['tn']} FN={c['fn']}   category acc={r['category_accuracy']}")
        for x in r["misses"]:
            print(f"   miss {x['id']} {x['label']}->{x['risk']} ({x['score']}): {x['text']}")
    print("\nWrote eval_results.md and eval_results.json")


if __name__ == "__main__":
    main()
