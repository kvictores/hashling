# Hashling 🐾

**A cyber-pet that lives in your browser.** Hashling catches scams, phishing and malware, and grows as you get smarter about security.
Built for HackUTD (T-Mobile "Safe Signal" track).

- **Protective:** a Chrome extension flags risky pages, links and emails (red / yellow), explains *why*, shows its confidence and what to do next.
- **Preventive:** a website with 3 daily security questions. Points grow your pet (egg → kitten → cub → adult) and buy customizations.
- **The link (the pitch):** warnings are delivered *by Hashling* (puffed-up alert pose, not a generic red box) to fight alert fatigue. Heeding a warning earns points; ignoring one makes Hashling sad; every blocked threat unlocks a bonus question about that scam type.

Everything works with **no API keys** (local heuristics + local hash list). Keys only add extra checks.

```
hashling/
  backend/     FastAPI + SQLite: detection engine, quiz, points, shop, events, eval.py
  web/         React + Vite + TypeScript + Tailwind: Den, Quiz, Scam Check, Shop, File Check, Passwords, About, demo pages
  extension/   Chrome Manifest V3, plain JS (no build step)
  scripts/     sync_items.py (copies items.json + pets.json from web → extension/hashling.js)
               export_hashling_assets.py (dev-only, needs Pillow: exports the visual-kit PNGs + icons)
```

## Quick start

Requirements: Python 3.11+, Node 18+, Chrome.

**1. Backend** (http://localhost:8000)
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env          # optional: add GEMINI_API_KEY / VIRUSTOTAL_API_KEY
uvicorn main:app --port 8000
```
The SQLite database (`backend/hashling.db`) and the 4 demo users are created automatically on first start.

**2. Web app** (http://localhost:5173)
```bash
cd web
npm install
npm run dev
```

**3. Chrome extension**
1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked** and select the `extension/` folder
4. Pin Hashling from the puzzle-piece menu so the popup is one click away

The extension talks to the backend only through its background service worker. Choosing a user in the web app also switches the extension's user.

### Optional keys (`backend/.env`)
| Variable | Effect |
|---|---|
| `GEMINI_API_KEY` | Enables AI refinement for anything heuristics already rate ≥ 30. Input is redacted first. |
| `GEMINI_MODEL` | Defaults to `gemini-3.8-flash`. Any Gemini model that supports `generateContent` with JSON output works. |
| `VIRUSTOTAL_API_KEY` | File Check also looks up the SHA-256 (fingerprint only) on VirusTotal. |

## Demo users
| User | Stage | Notes |
|---|---|---|
| Maya | egg | 0 points, streak 0 (new install) |
| Jordan | kitten | streak 3 |
| Priya | cub | streak 9 |
| Sam | adult | streak 21, owns and wears several items, shop unlocked |

**Hidden demo controls:** open any page with `?demo=1` for a panel with **+50 points**, **Next day** and **Reset user** (remembered until `?demo=0`).
You can also pick a user via URL: `http://localhost:5173/?user=sam`.

## 3-minute demo script

Before you start: backend + web running, extension loaded, open `http://localhost:5173/?demo=1&user=maya` and click **Reset user** for Maya and Sam.

1. **Meet Maya (0:00).** On the Den, Maya's Hashling is still an egg: 0 points, no streak. "Hashling grows when you get scam-smart."
2. **A scam page (0:15).** Open `http://localhost:5173/demo/parcel` (fictional "SwiftShip Parcel" fee page). Hashling's red modal appears: high risk, *package delivery scam*, top 3 reasons, confidence, an honest-uncertainty line and next steps.
3. **Back to safety (0:35).** Click **Back to safety**: "Good call! +5 points". Back in the Den, the protection card counts the block and a **bonus question** about package scams is waiting (+10).
4. **Email banners (0:55).** Open `http://localhost:5173/demo/inbox`. Click through the emails: red banners on the 3 scams, yellow on the housing survey, green on the 2 real ones. Hover the "Pay customs duty now" button: *"Hashling doesn't trust this link."*
5. **Scam Check (1:20).** Go to **Scam Check**, click the **Toll fee text** example, then **Check with Hashling**: score, category, confidence, reasons and what to do (forward to 7726). Try **Real 2FA code** to show it stays calm on legitimate urgency.
6. **Daily quiz (1:45).** Open **Daily Quiz** and answer the 3 questions (one multiple choice, one true/false, one spot-the-phish). Hashling climbs the vine tower on each correct answer (coin pops) and tumbles on a wrong one, with no points lost. The egg **hatches** the moment Maya passes 30 lifetime points, and the finish screen shows the shareable 🟩🟩🟥 result line.
7. **Switch to Sam (2:15).** Use the header switcher → **Sam** (adult, 21-day streak). The Den shows his rooftop garden, sprout crown and LED collar.
8. **Shop (2:25).** Open **Shop**. Hover items to try them on live, buy one, equip/unequip it. (Switch back to Maya to show "Grow Hashling to unlock".)
9. **Privacy (2:40).** Open **About & Privacy**: no content stored, redaction preview (see exactly what an AI would receive), files and passwords never leave the device.
10. **Accuracy (2:50).** Scroll to **Detection accuracy**: hybrid engine vs keyword baseline, with the confusion matrix, on both the main set and the held-out set.

## How detection works

1. **Heuristics (always on, local).** Score 0–100 with human-readable reasons:
   - URLs: punycode, raw IPs, brand lookalikes (Levenshtein ≤ 2, digit swaps like `paypa1`), brand names in subdomains/paths, scam-heavy TLDs, shorteners, hyphen chains, bait words, `http` forms.
   - Pages: password/card forms on a domain that doesn't match the brand on the page, countdown timers, "verify your account" + form.
   - Text: urgency, threats, gift-card/crypto/wire payment demands, fee demands, generic greetings, requests for codes/recovery phrases, sender vs claimed-brand mismatch, callback numbers, secrecy, romance and investment patterns. Safety language ("we'll never ask for this code") and official domains lower the score.
2. **Gemini refinement (optional).** Only when the heuristic score is ≥ 30 *and* a key is set. The payload is redacted (emails, phones, codes, card numbers, names → placeholders), limited to domains + 1,500 characters, and the model must answer in a JSON schema. Final score = max(heuristic, LLM) when the LLM's confidence ≥ 0.75, otherwise the average. Any failure falls back to heuristics.
3. **Risk levels:** safe < 30 ≤ yellow < 65 ≤ red.

The extension runs a JavaScript port of the URL/page heuristics first and only asks the backend when the local score is ≥ 30. Well-known sites (an allowlist of ~35) are skipped.

### Evaluation
```bash
cd backend
python eval.py            # add --no-llm to force heuristics only
```
Prints accuracy, precision, recall, F1 and a confusion matrix for the hybrid engine and a keyword-only baseline, and writes `eval_results.md` / `eval_results.json` (shown on the About page).

Current results (heuristics only):

| Dataset | Hybrid accuracy | Precision | Recall | F1 | Baseline accuracy |
|---|---|---|---|---|---|
| Main set (100 msgs) | 100% | 100% | 100% | 100% | 73% |
| Held-out set (30 msgs) | 86.7% | 100% | 77.8% | 87.5% | 76.7% |

The main set was written while building the rules, so its score is optimistic. The held-out set was written after the rules were frozen and was not used for tuning: it is the more honest number. Its 4 misses (a link-less "reply PAY" delivery fee, a parking fine behind a URL shortener, a "reshipping" job offer, a gift-card request phrased as "pick up") are known gaps.

## API
| Method | Path | Purpose |
|---|---|---|
| POST | `/analyze/url` | `{url, page_signals}` from the content script |
| POST | `/analyze/text` | `{text, channel: sms|email, sender?, subject?}` |
| POST | `/analyze/email` | `{sender, subject, body, links[]}` |
| POST | `/hash/check` | `{sha256}` → `known_malicious | clean | unknown` |
| GET | `/users`, `/users/{id}` | users with stage, streak, wallet, stats, equipped items |
| POST | `/users/{id}/reset`, `/users/{id}/demo/points`, `/users/{id}/demo/next-day` | demo controls |
| GET/POST | `/quiz/today?user_id=`, `/quiz/answer`, `/quiz/bonus?user_id=` | daily + bonus questions |
| GET/POST | `/shop?user_id=`, `/shop/buy`, `/shop/equip` | customization |
| POST | `/events` | `{user_id, type: warning_shown|warning_heeded|warning_ignored, risk, category, domain}` |
| POST | `/privacy/redact-preview` | shows what would be sent to the LLM (sends nothing) |
| GET | `/eval` | latest evaluation results |

## Points
- Correct answer +10 · perfect day (3/3) +15 · streak bonus +2 × streak (max +20/day)
- Heeded a warning +5 (max 3/day) · bonus question after a blocked threat +10
- Wrong answers and ignored warnings never cost points. Lifetime points drive growth (kitten 30, cub 100, adult 250); the wallet is spendable. The shop unlocks at adult.

## Notes and limitations
- **"Back to safety"** goes back in history when there is a previous page. When the warning page was opened in a fresh tab (no history), it sends the tab to Hashling's Den instead of closing it, so the reward and bonus question are visible.
- **Gmail** support (`extension/gmail.js`) uses Gmail's undocumented DOM. All selectors live in one config object and every step is wrapped in try/catch, but it hasn't been verified against a live Gmail account. The demo inbox is the reliable path.
- The **egg** stage shows its alert pose as a shaking egg with a "!" (no fur to puff up yet).
- Item artwork lives in `web/src/hashling/items.json`. After editing it, run `python scripts/sync_items.py` to update the extension.
- Uvicorn's `--reload` was unreliable on Windows during development; restart the server after backend changes.
- All brands (SwiftShip Parcel, MegaMart, Northbridge Bank, MetroToll, CloudNest, …) and all data are fictional. No third-party logos are used.

## Visual refresh: how the mascot is built
Hashling is the supplied PNG art (`web/public/assets/hashling`, `extension/assets/hashling`) with wearables drawn as SVG layers on
the art's anatomy anchors. `web/src/hashling/pets.json` holds each stage/fur's art file, normalisation and the crown / neck / chest /
shoulders / paw anchors; `items.json` holds the wearable SVG fragments. After editing either, run `python scripts/sync_items.py` so the
no-build-step extension (`extension/hashling.js`) stays identical. Layer order: shadow, behind-accessory, pet, front accessory, collar, hat.
The art is static, so moods are pose motion plus a small cue badge (the cub uses the supplied alert pose).
