/* Hashling link safety: LOCAL URL heuristics only (no network, no page loading, no backend).
 * Shared by content.js (whole-page protection) and the link-hover tooltips.
 *
 * This is a quick look at the address itself. It is NOT a malware scan and does not guarantee a link is safe.
 * Loaded as a plain script in the browser (window.HashlingLinkSafety) and with require() in tests/link-safety.test.cjs.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.HashlingLinkSafety = api;
})(typeof window !== 'undefined' ? window : (typeof self !== 'undefined' ? self : null), function () {
  'use strict';

  // ---------------------------------------------------------------- brand + domain data (subset of backend/data/brands.json)
  var BRANDS = {
    paypal: ['paypal.com'], amazon: ['amazon.com'], apple: ['apple.com', 'icloud.com'], microsoft: ['microsoft.com', 'live.com', 'outlook.com', 'office.com'],
    google: ['google.com', 'gmail.com', 'youtube.com'], netflix: ['netflix.com'], facebook: ['facebook.com', 'meta.com'], instagram: ['instagram.com'],
    whatsapp: ['whatsapp.com'], chase: ['chase.com'], wellsfargo: ['wellsfargo.com'], bankofamerica: ['bankofamerica.com'], citibank: ['citi.com', 'citibank.com'],
    usps: ['usps.com'], fedex: ['fedex.com'], dhl: ['dhl.com'], tmobile: ['t-mobile.com'], verizon: ['verizon.com'], walmart: ['walmart.com'],
    target: ['target.com'], costco: ['costco.com'], ebay: ['ebay.com'], coinbase: ['coinbase.com'], binance: ['binance.com'], venmo: ['venmo.com'],
    linkedin: ['linkedin.com'], dropbox: ['dropbox.com'], adobe: ['adobe.com'], spotify: ['spotify.com'], steam: ['steampowered.com', 'steamcommunity.com'],
    swiftship: ['swiftship.com'], megamart: ['megamart.com'], northbridge: ['northbridgebank.com'], crescentcu: ['crescentcu.org'], metrotoll: ['metrotoll.org'],
    streamly: ['streamly.tv'], cloudnest: ['cloudnest.com'], paywave: ['paywave.com'], nimbus: ['nimbuswireless.com'], orbitron: ['orbitron.com'],
    coinharbor: ['coinharbor.com'], hirepath: ['hirepath.com']
  };
  var SAFE = ['google.com', 'youtube.com', 'wikipedia.org', 'github.com', 'stackoverflow.com', 'microsoft.com', 'apple.com', 'amazon.com',
    'netflix.com', 'facebook.com', 'instagram.com', 'linkedin.com', 'reddit.com', 'x.com', 'twitter.com', 't-mobile.com', 'nytimes.com',
    'bbc.com', 'cnn.com', 'espn.com', 'weather.com', 'yahoo.com', 'bing.com', 'duckduckgo.com', 'openai.com', 'anthropic.com', 'claude.ai',
    'zoom.us', 'slack.com', 'notion.so', 'dropbox.com', 'paypal.com', 'chase.com', 'spotify.com', 'twitch.tv', 'utdallas.edu'];
  var OFFICIAL = {};
  Object.keys(BRANDS).forEach(function (k) { BRANDS[k].forEach(function (d) { OFFICIAL[d] = k; }); });
  var VERY_SUS_TLD = ['top', 'xyz', 'icu', 'click', 'live', 'cc', 'tk', 'ml', 'ga', 'cf', 'gq', 'rest', 'cyou', 'sbs', 'buzz', 'club', 'win', 'loan', 'zip', 'mov'];
  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'goo.gl', 'is.gd', 'ow.ly', 'cutt.ly', 'rb.gy', 'shorturl.at', 'tiny.cc', 'rebrand.ly'];
  var MULTI = ['co.uk', 'com.au', 'co.in', 'com.br', 'co.jp', 'gov.uk', 'ac.uk', 'org.uk'];
  function regDomain(host) {
    var parts = host.toLowerCase().replace(/\.$/, '').split('.');
    if (parts.length >= 3 && MULTI.indexOf(parts.slice(-2).join('.')) >= 0) return parts.slice(-3).join('.');
    return parts.slice(-2).join('.');
  }
  function isIP(h) { return /^\d{1,3}(\.\d{1,3}){3}$/.test(h) || h.indexOf(':') >= 0; }
  function lev(a, b) {
    if (a === b) return 0;
    var prev = [], i, j;
    for (j = 0; j <= b.length; j++) prev[j] = j;
    for (i = 1; i <= a.length; i++) {
      var cur = [i];
      for (j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[b.length];
  }

  /** Local URL heuristics (JS port of backend heuristics.analyze_url_string). Returns {score, reasons}. */
  function scoreUrl(url, base) {
    var out = { score: 0, reasons: [] };
    var u;
    try { u = new URL(url, base || 'https://invalid.example/'); } catch (e) { return out; }
    if (!/^https?:$/.test(u.protocol)) return out;
    var host = u.hostname.toLowerCase();
    var reg = regDomain(host);
    var label = reg.split('.')[0];
    var tld = reg.split('.').pop();
    var sub = host === reg ? '' : host.slice(0, -reg.length - 1);
    function add(w, r) { out.score += w; out.reasons.push(r); }
    if (OFFICIAL[reg] || SAFE.indexOf(reg) >= 0) return out;
    if (host.indexOf('xn--') >= 0) add(40, 'Uses punycode, which can disguise lookalike letters');
    if (isIP(host)) add(35, 'Points to a raw IP address');
    if (SHORTENERS.indexOf(reg) >= 0) add(22, 'Uses a URL shortener that hides the destination');
    if (u.username) add(30, "Hides its real destination with an '@' trick");
    var ascii = label.replace(/0/g, 'o').replace(/1/g, 'l').replace(/3/g, 'e').replace(/5/g, 's');
    var tokens = label.split('-').concat(ascii.split('-'));
    var found = false;
    Object.keys(BRANDS).some(function (b) {
      return BRANDS[b].some(function (off) {
        var ol = off.split('.')[0];
        if (ol.length < 5) return false;
        var cands = [label, ascii].concat(ol.length >= 6 ? tokens : []);
        for (var i = 0; i < cands.length; i++) {
          var c = cands[i];
          if (c.length < 4) continue;
          var d = lev(c, ol);
          if ((d > 0 && d <= (ol.length >= 7 ? 2 : 1)) || (ascii.indexOf(ol) >= 0 && label.indexOf(ol) < 0)) {
            add(45, "Lookalike of a known brand's domain (" + off + ')'); found = true; return true;
          }
        }
        if (ol.length >= 4 && ((label.indexOf(ol) >= 0 && label !== ol) || sub.indexOf(ol) >= 0)) {
          add(40, "Brand name '" + ol + "' is used on a site that isn't " + off); found = true; return true;
        }
        return false;
      });
    });
    if (VERY_SUS_TLD.indexOf(tld) >= 0) add(22, "Uses the '." + tld + "' ending, common on scam sites");
    if ((label.match(/-/g) || []).length >= 2) add(14, 'Strings words together with hyphens');
    if ((sub.match(/\./g) || []).length >= 2) add(10, 'Unusually deep chain of subdomains');
    if (/(verify|secure|login|signin|account|update|confirm|wallet|unlock|restore|billing|pay|claim|refund)/.test(label + '.' + sub)) add(10, "Domain contains a bait word like 'verify' or 'pay'");
    if (u.protocol === 'http:') add(5, 'Not encrypted (http)');
    out.score = Math.min(100, out.score);
    return out;
  }

  // ---------------------------------------------------------------- search-result redirects (decoded locally, never fetched)
  var REDIRECT_DEPTH = 3;
  var RED_AT = 65, CAUTION_AT = 20;
  // google.com or a real country domain (google.de, google.co.uk, google.com.au); not google.xyz / google.top lookalikes
  function isGoogleHost(h) { return /(^|\.)google\.(com|[a-z]{2}|co\.[a-z]{2}|com\.[a-z]{2})$/.test(h); }
  function isBingHost(h) { return /(^|\.)bing\.com$/.test(h); }
  function isDdgHost(h) { return /(^|\.)duckduckgo\.com$/.test(h); }

  function b64urlDecode(s) {
    try {
      var t = s.replace(/-/g, '+').replace(/_/g, '/');
      while (t.length % 4) t += '=';
      var bin = atob(t), bytes = '';
      for (var i = 0; i < bin.length; i++) bytes += '%' + ('00' + bin.charCodeAt(i).toString(16)).slice(-2);
      return decodeURIComponent(bytes);
    } catch (e) { return null; }
  }
  function httpUrl(v, base) {
    try { var u = new URL(v, base); return /^https?:$/.test(u.protocol) ? u : null; } catch (e) { return null; }
  }

  /**
   * One redirect hop of a supported search engine. Returns:
   *   { kind: 'none' }                      not a search redirect
   *   { kind: 'dest', url: URL }            destination decoded from the link itself
   *   { kind: 'unresolved' }                looks like a redirect but the destination can't be read locally
   */
  function unwrapSearchRedirect(u) {
    var h = u.hostname.toLowerCase(), p = u.pathname;
    if (isGoogleHost(h) && p === '/url') {
      var q = u.searchParams.get('q') || u.searchParams.get('url');
      var d = q && httpUrl(q);
      return d ? { kind: 'dest', url: d } : { kind: 'unresolved' };
    }
    if (isBingHost(h) && /^\/ck\/a\/?$/.test(p)) {
      var enc = u.searchParams.get('u') || '';
      var raw = /^a1/.test(enc) ? b64urlDecode(enc.slice(2)) : null;
      var d2 = raw && httpUrl(raw);
      return d2 ? { kind: 'dest', url: d2 } : { kind: 'unresolved' };
    }
    if (isDdgHost(h) && /^\/l\/?$/.test(p)) {
      var dd = u.searchParams.get('uddg');
      var d3 = dd && httpUrl(dd);
      return d3 ? { kind: 'dest', url: d3 } : { kind: 'unresolved' };
    }
    return { kind: 'none' };
  }

  /** Follow search-engine wrappers (a few levels at most). Returns { url: URL, unresolved: boolean, hops: number }. */
  function resolveDestination(href, base) {
    var u = httpUrl(href, base);
    if (!u) return null;
    var hops = 0;
    for (; hops < REDIRECT_DEPTH; hops++) {
      // a suspicious-looking "search engine" (e.g. google.cc) is judged as itself, never trusted to vouch for its destination
      if (scoreUrl(u.href, base).score >= CAUTION_AT) return { url: u, unresolved: false, hops: hops };
      var r = unwrapSearchRedirect(u);
      if (r.kind === 'none') return { url: u, unresolved: false, hops: hops };
      if (r.kind === 'unresolved') return { url: u, unresolved: true, hops: hops };
      u = r.url;
    }
    return { url: u, unresolved: unwrapSearchRedirect(u).kind !== 'none', hops: hops }; // wrapper chain too deep -> caution
  }

  // ---------------------------------------------------------------- the three tooltip levels
  /**
   * Classify a link for the hover tooltip. Never throws; returns null for non-http(s) links (no tooltip).
   * { level: 'green'|'yellow'|'red', title, host, reason, score }
   */
  function checkLink(href, base) {
    var res = resolveDestination(href, base);
    if (!res) return null;
    var u = res.url, host = u.hostname.toLowerCase().replace(/\.$/, '');
    var s = scoreUrl(u.href, base);
    var reasons = s.reasons.slice();
    var level, reason;
    if (res.unresolved) {
      level = 'yellow'; reason = "This is a search-engine redirect and the real destination can't be read from the link.";
    } else if (s.score >= RED_AT) {
      level = 'red'; reason = reasons[0] || 'Several warning signs in this address.';
    } else if (s.score >= CAUTION_AT || reasons.length) {
      level = 'yellow'; reason = reasons[0] || 'Something about this address looks unusual.';
    } else {
      level = 'green'; reason = 'No obvious URL risks.';
    }
    var title = level === 'red' ? 'Dangerous — high-risk link' : level === 'yellow' ? 'Caution' : 'Safe — no obvious URL risks';
    return { level: level, title: title, host: host, reason: reason, score: s.score, viaSearch: res.hops > 0 };
  }

  return { BRANDS: BRANDS, ALIASES: null, regDomain: regDomain, scoreUrl: scoreUrl, checkLink: checkLink, resolveDestination: resolveDestination, RED_AT: RED_AT, CAUTION_AT: CAUTION_AT };
});
