# Hashling detection accuracy

Generated 2026-11-08 04:00 UTC · engine: `heuristic` · threshold: risk ≥ yellow (score ≥ 30) counts as “scam”.

Baseline = flag a message if it contains any urgency/payment keyword (urgent, immediately, now, today, final notice, suspended, expire, act fast, verify, gift card, bitcoin, crypto, wire, pay, payment, fee, prize, won, winner).

> **Read with care.** All data is synthetic and written by our team. The main set was written while we built the rules, so its score is optimistic. The held-out set was written after the rules were frozen and never used for tuning; treat it as the more honest number. Neither set is a substitute for real-world testing.

### Main set: synthetic_messages.json (100 messages)

| Metric | Hashling hybrid | Keyword baseline |
|---|---|---|
| Accuracy | **1.000** | 0.730 |
| Precision | **1.000** | 0.797 |
| Recall | **1.000** | 0.785 |
| F1 | **1.000** | 0.791 |

Confusion matrix (positive = scam):

| | Predicted scam | Predicted legitimate |
|---|---|---|
| **Actual scam** | 65 (baseline 51) | 0 (baseline 14) |
| **Actual legitimate** | 0 (baseline 13) | 35 (baseline 22) |

Scam category correctly identified: **97%** of scams. Scams rated red: 49/65, yellow: 16/65.

Misclassified by Hashling: none.

### Held-out set: holdout_messages.json (30 messages)

| Metric | Hashling hybrid | Keyword baseline |
|---|---|---|
| Accuracy | **0.867** | 0.767 |
| Precision | **1.000** | 0.789 |
| Recall | **0.778** | 0.833 |
| F1 | **0.875** | 0.811 |

Confusion matrix (positive = scam):

| | Predicted scam | Predicted legitimate |
|---|---|---|
| **Actual scam** | 14 (baseline 15) | 4 (baseline 3) |
| **Actual legitimate** | 0 (baseline 4) | 12 (baseline 8) |

Scam category correctly identified: **72%** of scams. Scams rated red: 8/18, yellow: 6/18.

Misclassified by Hashling:
- `h02` scam → safe (score 0): Your parcel is waiting. Our driver needs a $1.50 fee to complete delivery. Reply PAY to re…
- `h06` scam → safe (score 22): City parking: unpaid citation for your vehicle. Pay $19 at https://bit.ly/city-park-pay to…
- `h10` scam → safe (score 25): After reviewing your resume, you are hired as a package forwarding coordinator. You will r…
- `h15` scam → safe (score 0): Hi it's your manager. I'm in a client meeting and need you to pick up three $100 gift card…
