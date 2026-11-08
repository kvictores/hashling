"""Hashling heuristic engine: fast, local, explainable. Always on, needs no API keys.

Every check appends a Signal(weight, reason, category_hint). The score is the capped sum of weights.
"""
from __future__ import annotations

import ipaddress
import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from urllib.parse import urlparse

DATA = Path(__file__).parent / "data"
_BRANDS = json.loads((DATA / "brands.json").read_text(encoding="utf-8"))

# brand key -> official registered domains
MAJOR: dict[str, list[str]] = _BRANDS["major"]
FICTIONAL: dict[str, dict] = _BRANDS["fictional"]
SAFE_DOMAINS: set[str] = set(_BRANDS["safe_domains"])

BRAND_DOMAINS: dict[str, list[str]] = {**MAJOR, **{k: v["domains"] for k, v in FICTIONAL.items()}}
_DISPLAY_FIX = {"paypal": "PayPal", "wellsfargo": "Wells Fargo", "bankofamerica": "Bank of America", "usps": "USPS",
                "fedex": "FedEx", "dhl": "DHL", "tmobile": "T-Mobile", "ebay": "eBay", "linkedin": "LinkedIn",
                "whatsapp": "WhatsApp", "citibank": "Citibank"}
BRAND_DISPLAY: dict[str, str] = {k: _DISPLAY_FIX.get(k, k.capitalize()) for k in MAJOR} | {k: v["display"] for k, v in FICTIONAL.items()}
# phrases that, when seen in text, mean "this message claims to be brand X"
BRAND_ALIASES: dict[str, list[str]] = {k: [k] for k in MAJOR} | {k: v["aliases"] for k, v in FICTIONAL.items()}
BRAND_ALIASES["bankofamerica"] = ["bank of america"]
BRAND_ALIASES["wellsfargo"] = ["wells fargo"]
BRAND_ALIASES["tmobile"] = ["t-mobile", "tmobile"]
BRAND_ALIASES["apple"] = ["apple support", "apple id", "icloud"]
BRAND_ALIASES["target"] = ["target.com", "target store"]  # avoid matching the plain English word
BRAND_ALIASES["steam"] = ["steam account", "steam support"]
BRAND_ALIASES["citibank"] = ["citibank", "citi bank"]
ALL_OFFICIAL = {d for ds in BRAND_DOMAINS.values() for d in ds}

SUSPICIOUS_TLDS = {"top", "xyz", "icu", "click", "live", "cc", "tk", "ml", "ga", "cf", "gq", "rest",
                   "cyou", "sbs", "buzz", "mom", "club", "info", "support", "online", "site", "win",
                   "loan", "work", "zip", "mov", "co", "io", "net"}
# a softer list: very commonly abused, weighted higher
VERY_SUSPICIOUS_TLDS = {"top", "xyz", "icu", "click", "live", "cc", "tk", "ml", "ga", "cf", "gq",
                        "rest", "cyou", "sbs", "buzz", "club", "win", "loan", "zip", "mov"}
SHORTENERS = {"bit.ly", "tinyurl.com", "t.co", "goo.gl", "is.gd", "ow.ly", "cutt.ly", "rb.gy",
              "shorturl.at", "tiny.cc", "buff.ly", "rebrand.ly", "s.id"}
MULTI_SUFFIXES = {"co.uk", "com.au", "co.in", "com.br", "co.jp", "gov.uk", "ac.uk", "org.uk", "com.mx"}
FREE_MAIL = {"gmail.com", "outlook.com", "yahoo.com", "hotmail.com", "aol.com", "proton.me",
             "protonmail.com", "icloud.com", "mail.com", "gmx.com"}
DANGEROUS_EXT = (".exe", ".scr", ".js", ".vbs", ".bat", ".cmd", ".msi", ".jar", ".html", ".htm",
                 ".zip", ".rar", ".iso", ".apk", ".lnk")

FILE_EXTS = {"pdf", "exe", "zip", "html", "htm", "ics", "js", "jpg", "jpeg", "png", "gif", "doc", "docx", "xls",
             "xlsx", "ppt", "pptx", "txt", "csv", "mp4", "mov", "heic", "webp", "rar", "scr", "msi", "vbs", "bat"}
URL_RE = re.compile(
    r"""(?ix)
    \b(
      (?:https?://)[^\s<>"']+                                     # explicit scheme
      |
      (?:[a-z0-9-]+\.)+(?:[a-z]{2,24})(?:/[^\s<>"']*)?          # bare domain like site.xyz/pay
    )""")


@dataclass
class Signal:
    weight: int
    reason: str
    category: str | None = None


@dataclass
class Result:
    score: int
    signals: list[Signal] = field(default_factory=list)
    category: str = "legitimate"
    has_links: bool = False
    brand: str | None = None

    @property
    def reasons(self) -> list[str]:
        return [s.reason for s in sorted(self.signals, key=lambda s: -s.weight) if s.weight > 0]


# --------------------------------------------------------------------------- helpers

def levenshtein(a: str, b: str) -> int:
    if a == b:
        return 0
    if len(a) < len(b):
        a, b = b, a
    prev = list(range(len(b) + 1))
    for i, ca in enumerate(a, 1):
        cur = [i]
        for j, cb in enumerate(b, 1):
            cur.append(min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (ca != cb)))
        prev = cur
    return prev[-1]


def registered_domain(host: str) -> str:
    host = host.lower().strip(".")
    parts = host.split(".")
    if len(parts) >= 3 and ".".join(parts[-2:]) in MULTI_SUFFIXES:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def is_ip(host: str) -> bool:
    try:
        ipaddress.ip_address(host.strip("[]"))
        return True
    except ValueError:
        return False


def normalize_url(raw: str) -> str:
    raw = raw.strip().rstrip(".,;:!?)\"'")
    if not re.match(r"^[a-z][a-z0-9+.-]*://", raw, re.I):
        raw = "http://" + raw if raw.lower().startswith(("www.",)) else "bare://" + raw
    return raw


def extract_urls(text: str) -> list[str]:
    urls = []
    for m in URL_RE.finditer(text or ""):
        u = m.group(1)
        # skip things that look like numbers/decimals ("$4.35") or emails
        if re.fullmatch(r"[\d.]+", u):
            continue
        start = m.start(1)
        if start > 0 and text[start - 1] == "@":
            continue
        host = urlparse(normalize_url(u)).hostname or ""
        tld = host.rsplit(".", 1)[-1] if "." in host else ""
        if not u.lower().startswith("http") and (len(tld) < 2 or tld.isdigit() or tld in {"m", "pm", "am"}):
            continue
        if not u.lower().startswith("http") and tld in FILE_EXTS:
            continue  # attachment filenames like Invoice.pdf
        urls.append(u.rstrip(".,;:!?)\"'"))
    return urls


def brands_in_text(text: str) -> list[str]:
    t = (text or "").lower()
    found = []
    for key, aliases in BRAND_ALIASES.items():
        for a in aliases:
            if re.search(r"(?<![a-z])" + re.escape(a) + r"(?![a-z])", t):
                found.append(key)
                break
    return found


def domain_is_official(reg: str, brand: str) -> bool:
    return reg in BRAND_DOMAINS.get(brand, [])


# --------------------------------------------------------------------------- URL checks

def analyze_url_string(url: str, claimed_brands: list[str] | None = None) -> list[Signal]:
    sigs: list[Signal] = []
    norm = normalize_url(url)
    p = urlparse(norm)
    host = (p.hostname or "").lower()
    if not host:
        return sigs
    reg = registered_domain(host)
    label = reg.split(".")[0]
    tld = reg.rsplit(".", 1)[-1]
    sub = host[: -len(reg)].rstrip(".") if host != reg else ""
    path = (p.path or "").lower()
    claimed_brands = claimed_brands or []

    if reg in ALL_OFFICIAL or reg in SAFE_DOMAINS:
        # official domain: only odd things like @ tricks still count
        if "@" in (p.netloc or ""):
            sigs.append(Signal(30, f"Link hides its real destination with an '@' trick ({host})"))
        return sigs

    if "xn--" in host:
        sigs.append(Signal(40, f"Link uses punycode ('{host}'), which can disguise lookalike letters", "account_verification"))
    if is_ip(host):
        sigs.append(Signal(35, f"Link points to a raw IP address ({host}) instead of a named website"))
    if reg in SHORTENERS:
        sigs.append(Signal(22, f"Link uses a URL shortener ({reg}) that hides the real destination"))
    if "@" in (p.netloc or ""):
        sigs.append(Signal(30, f"Link hides its real destination with an '@' trick"))

    # lookalike of a brand (Levenshtein on the domain label)
    ascii_label = label.replace("0", "o").replace("1", "l").replace("3", "e").replace("5", "s")
    whole = {label, ascii_label}
    tokens = (set(label.split("-")) | set(ascii_label.split("-"))) - whole
    for brand, domains in BRAND_DOMAINS.items():
        for off in domains:
            off_label = off.split(".")[0]
            if len(off_label) < 5:
                continue
            if off_label in ascii_label and off_label not in label:
                sigs.append(Signal(45, f"Domain '{reg}' is a lookalike of {BRAND_DISPLAY[brand]} that swaps letters for numbers", None))
                break
            for cand in list(whole) + (list(tokens) if len(off_label) >= 6 else []):
                if len(cand) < 4:
                    continue
                d = levenshtein(cand, off_label)
                if 0 < d <= (2 if len(off_label) >= 7 else 1):
                    sigs.append(Signal(45, f"Domain '{reg}' is a lookalike of {BRAND_DISPLAY[brand]} ({off})", None))
                    break
            else:
                continue
            break
        else:
            continue
        break

    # brand name embedded in domain/subdomain/path but not the brand's registered domain
    already_lookalike = any("lookalike" in s.reason for s in sigs)
    if not already_lookalike:
        for brand, domains in BRAND_DOMAINS.items():
            off_labels = {d.split(".")[0] for d in domains}
            for ol in off_labels:
                if len(ol) < 4:
                    continue
                where = None
                if ol in label and label != ol:
                    where = "domain name"
                elif ol in sub:
                    where = "subdomain"
                elif ol in path and len(ol) >= 5:
                    where = "path"
                if where:
                    sigs.append(Signal(40, f"'{BRAND_DISPLAY[brand]}' appears in the link's {where}, but the site is really '{reg}'"))
                    break
            else:
                continue
            break

    # claimed brand (from surrounding text) vs link domain
    if claimed_brands and not any(domain_is_official(reg, b) for b in claimed_brands) and not any("appears in the link" in s.reason or "lookalike" in s.reason for s in sigs):
        b = claimed_brands[0]
        sigs.append(Signal(30, f"Link domain '{reg}' doesn't match {BRAND_DISPLAY[b]}'s official site ({BRAND_DOMAINS[b][0]})"))

    if tld in VERY_SUSPICIOUS_TLDS:
        sigs.append(Signal(22, f"Link uses the '.{tld}' domain ending, which is heavily used by scam sites"))
    elif tld in SUSPICIOUS_TLDS and tld not in {"net", "co", "io", "info", "online", "site", "support"}:
        sigs.append(Signal(10, f"Link uses an uncommon '.{tld}' domain ending"))
    elif tld in {"info", "support", "online", "site"}:
        sigs.append(Signal(12, f"Link uses the '.{tld}' domain ending, common on throwaway sites"))

    if label.count("-") >= 2:
        sigs.append(Signal(14, f"Domain '{reg}' strings words together with hyphens (common in phishing)"))
    elif label.count("-") == 1:
        sigs.append(Signal(6, f"Domain '{reg}' uses a hyphenated name"))
    if sub.count(".") >= 2:
        sigs.append(Signal(10, f"Link has an unusually deep chain of subdomains"))
    if re.search(r"(verify|secure|login|signin|account|update|confirm|wallet|unlock|restore|billing|pay|claim|refund)", label + "." + sub):
        sigs.append(Signal(10, f"Domain contains a bait word like 'verify', 'secure' or 'pay' ({reg})"))
    if path.endswith(DANGEROUS_EXT[:6]):
        sigs.append(Signal(30, f"Link downloads a program file ({path.rsplit('/', 1)[-1]})", "tech_support"))
    if p.scheme == "http":
        sigs.append(Signal(5, "Link isn't encrypted (http, not https)"))
    return sigs


# --------------------------------------------------------------------------- text checks

URGENCY = [r"\burgent\b", r"\bimmediately\b", r"\bwithin \d+ (?:hours?|hrs?|minutes?)\b", r"\bfinal (?:notice|attempt|warning)\b",
           r"\bact now\b", r"\blast chance\b", r"\bexpires? (?:today|soon|tonight)\b", r"\btoday\b(?=.*\b(?:pay|verify|confirm|settle|avoid|deposit)\b)",
           r"\bby tonight\b", r"\bright now\b", r"\bin \d+ hours\b", r"\blimited time\b", r"\bonly \d+ \w+ left\b",
           r"\bbefore it expires\b", r"\bspots are limited\b", r"\bby tomorrow\b"]
THREAT = [r"\bsuspend(?:ed|ion)?\b", r"\b(?:locked|frozen|limited|restricted|disconnected|deleted|cancell?ed|deactivated)\b",
          r"\bwarrant\b", r"\barrest\b", r"\bcourt fees?\b", r"\blate fee\b", r"\bpenalty\b", r"\benforcement\b",
          r"\bwill be returned\b", r"\breturn(?:ed)? to sender\b", r"\bon hold\b", r"\bheld\b", r"\bdata loss\b"]
PAYMENT = [(r"\b(?:pay|paid|buy|purchase|send|get|grab|scratch|with|in|using)\b[^.]{0,25}\bgift ?cards?\b|\bgift ?cards?\b[^.]{0,30}\b(?:codes?|numbers?|photos?)\b", "gift cards"), (r"\bprepaid cards?\b", "prepaid cards"), (r"\bbitcoin\b|\bbtc\b", "Bitcoin"),
           (r"\busdt\b|\bcrypto(?:currency)?\b", "crypto"), (r"\bwire(?:d)?\b(?: (?:transfer|the rest|it|money))?", "wire transfer"),
           (r"\bbitcoin atm\b", "a Bitcoin ATM"), (r"\btransfer app\b", "a money-transfer app")]
FEE = [r"\b(?:redelivery|handling|delivery|customs|processing|shipping|release|equipment|training kit|verification) (?:fee|duty)\b",
       r"\bcustoms duty\b", r"\bunpaid (?:toll|charges?|ticket|balance|fee)\b", r"\boutstanding (?:toll )?balance\b",
       r"\bto avoid (?:a |an |additional |the )?(?:\$\d+ )?(?:late |additional )?(?:fees?|penalty|suspension|return|arrest)\b",
       r"\bsmall fee\b", r"\bcover \$\d", r"\bpay(?:ing)? (?:a |the )?\$?\d+(?:\.\d+)? ?(?:fee|tax)\b", r"\b\d+% tax\b"]
GENERIC_GREETING = [r"\bdear (?:valued )?(?:customer|user|member|client|shopper|account holder|driver|sir|madam)\b",
                    r"\bhello dear\b", r"\bdear friend\b", r"\b(?:hi|hello) (?:customer|user|student|member),"]
CODE_REQUEST = [r"\b(?:reply|respond|text|send|tell|read|give|share|provide|forward)\b[^.]{0,40}\b(?:code|otp|passcode|pin)\b",
                r"\b(?:code|otp|passcode)\b[^.]{0,30}\b(?:to (?:us|me|cancel|verify|confirm))\b",
                r"\brecovery phrase\b", r"\bseed phrase\b", r"\b12-word\b", r"\bapprove the (?:next )?(?:notification|prompt|request)\b"]
PROTECTIVE = [r"\b(?:don'?t|do not|never) share\b", r"\bwill never (?:call|text|ask|email)\b", r"\bnever ask\b",
              r"\bwe'?ll never ask\b", r"\bno action (?:is )?needed\b", r"\byou can ignore this\b", r"\bnothing will be deleted\b",
              r"\bautopay is on\b", r"\bnumber on the back of your card\b", r"\bin the [a-z]+ app\b", r"\bopen the [a-z]+ app\b"]
PERSONAL = [(r"\bssn\b|\bsocial security\b", "your Social Security number"), (r"\bcard (?:number|details)\b|\bcard number and expiry\b", "card details"),
            (r"\bbank details\b|\baccount number\b|\bmember number\b", "bank details"), (r"\bcopy of your (?:id|driver'?s license|passport)\b|\bdriver'?s license\b", "an ID document"),
            (r"\bpin\b(?! or full card)", "your PIN"), (r"\bpayment info(?:rmation)?\b|\bbilling information\b", "payment info"),
            (r"\b(?:online banking )?credentials\b", "your login credentials"), (r"\bfull name, address\b", "personal details")]
CATEGORY_KEYWORDS = {
    "package_delivery": [r"\bpackage\b", r"\bparcel\b", r"\bdeliver(?:y|ed)\b", r"\bshipment\b", r"\bredelivery\b", r"\bwarehouse\b", r"\bcustoms duty\b", r"\btracking\b", r"\bswiftship\b", r"\busps\b"],
    "bank_impersonation": [r"\bbank\b", r"\bdebit card\b", r"\bcredit union\b", r"\bfraud team\b", r"\bcharge\b", r"\btransfer of\b", r"\bsavings\b", r"\bonline banking\b", r"\bcard ending\b", r"\bnorthbridge\b", r"\bcrescent\b", r"\bdispute\b"],
    "toll_fee": [r"\btolls?\b", r"\bparking\b", r"\bticket\b", r"\bdmv\b", r"\bvehicle\b", r"\bplate\b", r"\bdriving\b", r"\bregistration\b", r"\bmetrotoll\b"],
    "prize_giveaway": [r"\bwon\b", r"\bwinner\b", r"\bprize\b", r"\bcongratulations\b", r"\bsweepstakes\b", r"\breward\b", r"\blottery\b", r"\bsurvey\b", r"\bclaim\b", r"\bselected to receive\b"],
    "job_offer": [r"\bhiring\b", r"\bhired\b", r"\bresume\b", r"\brecruiter\b", r"\bjob\b", r"\bremote\b", r"\bper day\b|/day\b|\bdaily\b", r"\bmystery shopper\b", r"\bonboarding\b", r"\bposition\b", r"\bwork from home\b|\bonline work\b|\bfrom home\b"],
    "tech_support": [r"\bvirus(?:es)?\b", r"\btechnicians?\b", r"\bsupport\b", r"\brefund\b", r"\bsubscription\b", r"\brenew(?:al|ed)\b", r"\bremote (?:assistant|access)\b", r"\blicense has expired\b", r"\bcomputer\b|\bpc\b", r"\binvoice\b", r"\bprotection plan\b"],
    "account_verification": [r"\bverify\b", r"\bpassword\b", r"\bmailbox\b", r"\bstorage\b", r"\bsign-?in\b", r"\blog ?in\b", r"\baccount\b", r"\bsim\b", r"\bidentity\b", r"\bmembership\b", r"\bbilling information\b", r"\bprompts?\b"],
    "gift_card_request": [r"\bgift ?cards?\b", r"\bprepaid cards?\b", r"\bfavor\b", r"\bbail\b", r"\bwarrant\b", r"\bjury duty\b", r"\bdisconnect(?:ed|ion)\b", r"\bkeep this between us\b|\bdon'?t tell\b", r"\bcodes\b", r"\breimburse\b|\bpay you back\b"],
    "romance": [r"\bmy love\b", r"\bdarling\b", r"\bsweetheart\b", r"\bdear\b", r"\bmissing you\b", r"\bfly to you\b", r"\bfeel so close\b", r"\bstranded\b", r"\bvideo call\b", r"\bvisa\b", r"\bour future\b", r"\bprofile\b"],
    "crypto_investment": [r"\bcrypto\b", r"\bbitcoin\b|\bbtc\b", r"\busdt\b", r"\breturns\b", r"\binvest(?:ment|ing)?\b", r"\btrading\b", r"\bwallet\b", r"\bdouble your\b", r"\bwithdraw(?:al)?\b", r"\bdeposit\b", r"\bprofit\b"],
}


def _any(patterns, text) -> list[str]:
    return [m.group(0) for p in patterns if (m := re.search(p, text))]


def analyze_text_core(text: str, channel: str = "sms", sender: str = "", subject: str = "",
                      links: list[str] | None = None) -> Result:
    full = " ".join(x for x in [subject, text] if x)
    t = full.lower()
    sigs: list[Signal] = []
    brands = brands_in_text(full + " " + (sender or ""))

    # --- links
    urls = list(dict.fromkeys((links or []) + extract_urls(full)))
    link_scores = []
    for u in urls:
        ls = analyze_url_string(u, brands)
        link_scores.append((sum(s.weight for s in ls), ls))
    if link_scores:
        best = max(link_scores, key=lambda x: x[0])
        sigs.extend(best[1][:4])

    # --- sender checks
    s_low = (sender or "").lower()
    m = re.search(r"@([a-z0-9.-]+)", s_low)
    if m:
        sreg = registered_domain(m.group(1))
        if "xn--" in sreg:
            pass  # handled via links usually
        if brands and not any(domain_is_official(sreg, b) for b in brands):
            if sreg in FREE_MAIL:
                sigs.append(Signal(30, f"Claims to be {BRAND_DISPLAY[brands[0]]} but was sent from a free webmail address ({sreg})"))
            else:
                sigs.append(Signal(28, f"Sender domain '{sreg}' doesn't match {BRAND_DISPLAY[brands[0]]}'s real domain ({BRAND_DOMAINS[brands[0]][0]})"))
        elif not brands and sreg in FREE_MAIL and re.search(r"\b(?:ceo|hr|hiring|office|capt|official|support|admin|love)\b|[._](?:ceo|hr|office)", s_low):
            sigs.append(Signal(15, f"Official-sounding role or title sent from a personal webmail address ({sreg})"))
        elif not brands and sreg not in FREE_MAIL and any(s.reason.startswith("Link") for s in sigs) is False:
            stld = sreg.rsplit(".", 1)[-1]
            if stld in VERY_SUSPICIOUS_TLDS or stld in {"info", "support", "live", "cc"}:
                sigs.append(Signal(15, f"Sender uses a throwaway-style domain ({sreg})"))
        if channel == "sms":
            sigs.append(Signal(15, "Text message sent from an email address, a common way to dodge spam filters"))
    elif channel == "sms" and re.search(r"\+\d|\(\d{3}\)", s_low):
        if s_low.startswith("+") and not s_low.startswith("+1"):
            sigs.append(Signal(12, f"Sent from an international number ({sender.strip()})"))
        if brands and any(b in FICTIONAL or b in MAJOR for b in brands):
            sigs.append(Signal(8, f"Claims to be {BRAND_DISPLAY[brands[0]]} but comes from a personal phone number, not a short code"))

    # --- language
    urg = _any(URGENCY, t)
    if urg:
        sigs.append(Signal(min(10 + 5 * (len(urg) - 1), 20), f"Uses urgency to rush you (\"{urg[0]}\")"))
    thr = _any(THREAT, t)
    if thr:
        sigs.append(Signal(min(10 + 4 * (len(thr) - 1), 18), f"Threatens a consequence (\"{thr[0]}\") if you don't act"))
    pays = [(lbl) for pat, lbl in PAYMENT if re.search(pat, t)]
    if pays:
        sigs.append(Signal(30, f"Asks for payment via {pays[0]}, which is almost impossible to reverse", "gift_card_request" if "gift" in pays[0] or "prepaid" in pays[0] else None))
    fees = _any(FEE, t)
    if fees:
        sigs.append(Signal(20, f"Demands a fee or unpaid balance (\"{fees[0]}\")"))
    gg = _any(GENERIC_GREETING, t)
    if gg:
        sigs.append(Signal(12, f"Generic greeting (\"{gg[0]}\") instead of your name"))
    prot = _any(PROTECTIVE, t)
    codes = _any(CODE_REQUEST, t)
    codes = [c for c in codes if not re.search(r"\b(?:don'?t|do not|never|ignore)\b", c)]
    if codes and not prot:
        sigs.append(Signal(35, "Asks you to share or approve a security code, recovery phrase or login prompt", "account_verification"))
    elif codes:
        sigs.append(Signal(15, "Mentions sending or approving a security code"))
    pers = [lbl for pat, lbl in PERSONAL if re.search(pat, t)]
    if pers and re.search(r"\b(?:send|enter|confirm|provide|reply|update|re-?validate|give|need)\b", t):
        sigs.append(Signal(25, f"Asks for sensitive info ({pers[0]})"))
    if re.search(r"\b(?:verify|confirm|re-?validate|update|sync)\b[^.]{0,30}\b(?:account|identity|details|credentials|address|billing|payment|wallet)\b", t) and urls:
        sigs.append(Signal(15, "Asks you to 'verify' or 'confirm' your details through a link", "account_verification"))
    if re.search(r"\b(?:you(?:'ve| have)? (?:been selected|won)|you'?re our (?:lucky )?winner|lucky winner|congratulations|your email address won|claim your (?:exclusive |free )?(?:reward|prize|gift))\b", t):
        sigs.append(Signal(22, "Says you've won or been selected for something you didn't enter", "prize_giveaway"))
    if re.search(r"\$\d{2,4}(?:\s?-\s?\$\d{2,4})?\s?(?:/day|per day|daily|a day)\b", t) or re.search(r"\bno (?:experience|interview) (?:needed|required)\b", t):
        sigs.append(Signal(25, "Promises unusually high pay for little or no experience", "job_offer"))
        if re.search(r"\b\d(?:-\d)? hours? a day\b|\bflexible\b|\bpart-time\b", t):
            sigs.append(Signal(10, "Very short or flexible hours for very high pay", "job_offer"))
    if re.search(r"\b(?:whatsapp|telegram|signal app|private chat app)\b", t):
        sigs.append(Signal(15, "Moves the conversation to a private chat app", "job_offer"))
    if re.search(r"\b(?:send|mail(?:ed)?) you a check\b|\bdeposit it\b", t):
        sigs.append(Signal(30, "Fake-check pattern: deposit a check and send money back", "job_offer"))
    if re.search(r"\b(?:guaranteed|zero risk|risk-free)\b|\bdouble your\b|\b\d{2,4}% (?:weekly|daily|monthly|in \d+ days)?\s?returns?\b|\b\d{3,4}% in\b|\breceive \d+(?:\.\d+)? btc back\b", t):
        sigs.append(Signal(30, "Promises guaranteed or impossible investment returns", "crypto_investment"))
    if re.search(r"\b(?:made|earned|making) \$\d+k?\b.*\b(?:crypto|trading)\b|\b(?:crypto|trading)\b.*\b(?:made|earned|rich)\b", t):
        sigs.append(Signal(25, "Brags about crypto or trading profits to lure you in", "crypto_investment"))
    if re.search(r"\bwrong number\b", t) and re.search(r"\b(?:crypto|trading|invest)\b", t):
        sigs.append(Signal(15, "'Wrong number' opener followed by investment talk", "crypto_investment"))
    if re.search(r"\b(?:viruse?s? detected|infected|license has expired|error reports|at risk)\b", t):
        sigs.append(Signal(25, "Scare tactic: claims your device is infected or at risk", "tech_support"))
    if re.search(r"\b(?:install|download)\b[^.]{0,40}\b(?:remote|assistant|cleaner|anydesk|teamviewer)\b", t):
        sigs.append(Signal(30, "Asks you to install remote-access or 'cleaner' software", "tech_support"))
    if re.search(r"\bcall\b[^.]{0,40}(?:\d{3}[-) .]+\d{3}[- .]\d{4}|\d-\d{3}-\d{3}-\d{4})", t) and re.search(r"\b(?:did not authorize|didn'?t authorize|refund|technician|cancel|stop it|security line|support|avoid|card number)\b", t) and not re.search(r"number on the back of your card", t):
        sigs.append(Signal(28, "Pushes you to call a phone number given in the message (callback scam)"))
    if re.search(r"\b(?:call(?:ing)? (?:you|us) (?:back|shortly)|specialist will call|technician will help)\b", t):
        sigs.append(Signal(15, "Says someone will call you or asks you to call back about a security issue"))
    if re.search(r"\b(?:saw your profile|you are kind|you seem nice|working abroad|on the oil rig)\b", t):
        sigs.append(Signal(10, "Unsolicited flattery or a far-away backstory, common in romance scams", "romance"))
    if re.search(r"\b(?:keep this between us|don'?t tell|do not discuss|can'?t talk)\b", t):
        sigs.append(Signal(25, "Asks for secrecy, a hallmark of impersonation scams", "gift_card_request"))
    if re.search(r"\b(?:move|transfer) your (?:savings|money|funds)\b|\bprotected account\b|\bsafe account\b", t):
        sigs.append(Signal(35, "Asks you to move money to a 'protected' account", "bank_impersonation"))
    if re.search(r"\b(?:my love|darling|sweetheart|i feel so close|missing you)\b", t) and re.search(r"\b(?:money|\$\d|ticket|fee|send|wire|gift|crypto|account|help)\b", t):
        sigs.append(Signal(25, "Emotional relationship language combined with a money request", "romance"))
    if re.search(r"\b(?:stranded|stuck|in trouble|lost my phone|accounts? (?:are |is )?frozen|card was blocked|in the hospital)\b", t) and re.search(r"\b(?:send|help me|need \$|money|pay you back|repay|ticket|gift cards?)\b", t):
        sigs.append(Signal(25, "Sudden emergency that only your money can fix", "romance"))
    if re.search(r"\breply (?:y|yes)\b[^.]{0,40}\b(?:link|instructions)\b|\breopen this message\b", t):
        sigs.append(Signal(25, "Asks you to reply so a hidden link becomes clickable (smishing trick)"))
    if re.search(r"\b(?:attachment|attached)\b", t):
        att = re.findall(r"[\w-]+\.(?:[a-z0-9]{2,4})(?:\.[a-z0-9]{2,4})?\b", full, re.I)
        bad = [a for a in att if a.lower().endswith(DANGEROUS_EXT)]
        if bad:
            dbl = re.search(r"\.(pdf|doc|docx|jpg|png)\.(exe|scr|js|vbs)$", bad[0], re.I)
            sigs.append(Signal(35 if dbl else 22, f"Attachment '{bad[0]}' " + ("disguises a program as a document" if dbl else "is a file type often used to deliver malware or fake forms"), "tech_support" if dbl else None))
    if re.search(r"\b(?:system upgrade|re-?validate|keep the same password|password expires)\b", t):
        sigs.append(Signal(18, "Uses a 'system upgrade' or 'password expiry' excuse to get your login", "account_verification"))

    # protective / legitimate signals
    if prot:
        sigs.append(Signal(-12 * min(len(prot), 2), "Includes standard safety language (e.g. 'never share this code')"))
    if urls and link_scores and max(s for s, _ in link_scores) == 0 and brands:
        sigs.append(Signal(-10, "Links go to the brand's official domain"))
    if re.fullmatch(r"\d{5,6}", (sender or "").strip()):
        sigs.append(Signal(-8, "Sent from a short code typically used by registered businesses"))
    if m and brands and any(domain_is_official(registered_domain(m.group(1)), b) for b in brands):
        sigs.append(Signal(-12, "Sender address matches the brand's official domain"))

    score = max(0, min(100, sum(s.weight for s in sigs)))
    cat = classify(t, sigs, score, brands[0] if brands else None)
    return Result(score=score, signals=sigs, category=cat, has_links=bool(urls), brand=brands[0] if brands else None)


BRAND_CATEGORY = {
    "northbridge": "bank_impersonation", "crescentcu": "bank_impersonation", "chase": "bank_impersonation",
    "wellsfargo": "bank_impersonation", "bankofamerica": "bank_impersonation", "citibank": "bank_impersonation",
    "swiftship": "package_delivery", "usps": "package_delivery", "fedex": "package_delivery", "dhl": "package_delivery",
    "metrotoll": "toll_fee", "coinharbor": "crypto_investment", "coinbase": "crypto_investment", "binance": "crypto_investment",
    "orbitron": "tech_support", "microsoft": "tech_support", "megamart": "prize_giveaway",
}


def classify(t: str, sigs: list[Signal], score: int, brand: str | None = None) -> str:
    if score < 30:
        return "legitimate"
    scores = {c: sum(1 for p in pats if re.search(p, t)) for c, pats in CATEGORY_KEYWORDS.items()}
    if brand in BRAND_CATEGORY:
        scores[BRAND_CATEGORY[brand]] += 3
    for s in sigs:
        if s.category and s.weight > 0:
            scores[s.category] = scores.get(s.category, 0) + 2
    best = max(scores.items(), key=lambda kv: kv[1])
    return best[0] if best[1] > 0 else "account_verification"


# --------------------------------------------------------------------------- page (extension) checks

def analyze_page(url: str, page_signals: dict | None) -> Result:
    ps = page_signals or {}
    p = urlparse(normalize_url(url))
    host = (p.hostname or "").lower()
    reg = registered_domain(host) if host else ""
    snippet = (ps.get("text") or ps.get("snippet") or "")[:3000]
    title = ps.get("title") or ""
    brand_mentions = [b.lower().replace(" ", "") for b in (ps.get("brand_mentions") or [])]
    brands = list(dict.fromkeys([b for b in brand_mentions if b in BRAND_DOMAINS] + brands_in_text(title + " " + snippet)))
    is_local_demo = host in {"localhost", "127.0.0.1"}

    sigs: list[Signal] = []
    if not is_local_demo:
        sigs.extend(analyze_url_string(url, brands))
    else:
        # demo pages run on localhost; judge them by the brand they impersonate
        if brands:
            sigs.append(Signal(30, f"Page claims to be {BRAND_DISPLAY[brands[0]]} but isn't on its official site ({BRAND_DOMAINS[brands[0]][0]})"))

    has_pw, has_card = bool(ps.get("has_password_form")), bool(ps.get("has_card_form"))
    brand_mismatch = brands and not any(domain_is_official(reg, b) for b in brands)
    if (has_pw or has_card) and brand_mismatch:
        what = "card number" if has_card else "password"
        sigs.append(Signal(35, f"Asks for your {what} on a site that isn't {BRAND_DISPLAY[brands[0]]}'s real domain"))
    elif has_card and not (reg in ALL_OFFICIAL or reg in SAFE_DOMAINS):
        sigs.append(Signal(12, "Page asks for card details"))
    if p.scheme == "http" and (has_pw or has_card) and not is_local_demo:
        sigs.append(Signal(25, "Collects a password or card number over an unencrypted (http) connection"))
    if ps.get("has_countdown"):
        sigs.append(Signal(15, "Countdown timer pressures you to act fast"))
    low = (title + " " + snippet).lower()
    if re.search(r"\bverify your (?:account|identity)\b|\bconfirm your (?:account|identity|details)\b", low) and (has_pw or has_card or ps.get("has_form")):
        sigs.append(Signal(20, "'Verify your account' message paired with a form"))

    # reuse the text engine on visible text (no links, sender) for language signals
    if snippet:
        tr = analyze_text_core(snippet, channel="web")
        lang = [s for s in tr.signals if not s.reason.startswith("Link") and "domain" not in s.reason.lower() and s.weight > 0]
        sigs.extend(lang[:5])

    score = max(0, min(100, sum(s.weight for s in sigs)))
    cat = classify(low, sigs, score, brands[0] if brands else None)
    return Result(score=score, signals=sigs, category=cat, has_links=True, brand=brands[0] if brands else None)
