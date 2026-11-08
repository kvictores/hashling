"""File-hash reputation: local list first, then VirusTotal (only if a key is set). Only the hash is ever sent."""
from __future__ import annotations

import json
import os
from pathlib import Path

import httpx

_DATA = json.loads((Path(__file__).parent / "data" / "malicious_hashes.json").read_text(encoding="utf-8"))
BAD: dict = _DATA["hashes"]
CLEAN: dict = _DATA["known_clean"]


def vt_available() -> bool:
    return bool(os.getenv("VIRUSTOTAL_API_KEY"))


def check(sha256: str) -> dict:
    if sha256 in BAD:
        e = BAD[sha256]
        return {"status": "known_malicious", "source": "local", "name": e["name"], "note": e["note"],
                "detail": "This file's fingerprint matches Hashling's local list of known-bad files."}
    if sha256 in CLEAN:
        return {"status": "clean", "source": "local", "name": CLEAN[sha256], "detail": "Matches a known-clean file."}
    if vt_available():
        try:
            r = httpx.get(f"https://www.virustotal.com/api/v3/files/{sha256}",
                          headers={"x-apikey": os.environ["VIRUSTOTAL_API_KEY"]}, timeout=8)
            if r.status_code == 404:
                return {"status": "unknown", "source": "virustotal", "detail": "VirusTotal has never seen this file."}
            r.raise_for_status()
            stats = r.json()["data"]["attributes"]["last_analysis_stats"]
            mal, sus = stats.get("malicious", 0), stats.get("suspicious", 0)
            total = sum(stats.values()) or 1
            status = "known_malicious" if mal >= 3 else ("clean" if mal == 0 and sus == 0 else "unknown")
            return {"status": status, "source": "virustotal", "stats": stats,
                    "detail": f"{mal} of {total} security engines flagged this file as malicious."}
        except Exception as e:  # network/key errors fall back gracefully
            return {"status": "unknown", "source": "local", "detail": f"Not in local list; VirusTotal lookup failed ({type(e).__name__})."}
    return {"status": "unknown", "source": "local",
            "detail": "Not in Hashling's local list. Unknown doesn't mean safe: only open files you expected."}
