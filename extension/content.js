/* Hashling page scanner. Runs on all pages.
 * 1) cheap local checks (URL heuristics + page signals)  2) only if local score >= 30, ask the backend (via background.js)
 * 3) red -> full-page modal in a closed Shadow DOM, yellow -> toast. Only metadata (type/risk/category/domain) is logged.
 */
(function () {
  'use strict';
  if (window.top !== window || window.__hashlingContent) return;
  window.__hashlingContent = true;

  var WEB_ORIGIN = 'http://localhost:5173';
  var LOCAL_THRESHOLD = 30;

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
  // phrases that mean "this page claims to be brand X" (fictional + a few real)
  var ALIASES = {
    swiftship: ['swiftship'], megamart: ['megamart', 'mega mart'], northbridge: ['northbridge'], crescentcu: ['crescent credit union'],
    metrotoll: ['metrotoll'], streamly: ['streamly'], cloudnest: ['cloudnest'], paywave: ['paywave'], nimbus: ['nimbus wireless'],
    orbitron: ['orbitron'], coinharbor: ['coinharbor'], hirepath: ['hirepath'], paypal: ['paypal'], amazon: ['amazon'], netflix: ['netflix'],
    microsoft: ['microsoft'], apple: ['apple id', 'icloud'], chase: ['chase bank'], wellsfargo: ['wells fargo'], bankofamerica: ['bank of america'],
    usps: ['usps'], fedex: ['fedex'], dhl: ['dhl'], coinbase: ['coinbase'], binance: ['binance'], venmo: ['venmo'], ebay: ['ebay']
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
  function scoreUrl(url) {
    var out = { score: 0, reasons: [] };
    var u;
    try { u = new URL(url, location.href); } catch (e) { return out; }
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

  // ---------------------------------------------------------------- page signals
  function visibleText(limit) {
    var t = (document.body && document.body.innerText) || '';
    return t.replace(/\s+/g, ' ').trim().slice(0, limit);
  }
  function brandMentions(text) {
    var low = (document.title + ' ' + text).toLowerCase();
    return Object.keys(ALIASES).filter(function (k) {
      return ALIASES[k].some(function (a) { return new RegExp('(^|[^a-z])' + a.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '([^a-z]|$)').test(low); });
    });
  }
  function hasCardForm() {
    var inputs = document.querySelectorAll('input');
    for (var i = 0; i < inputs.length; i++) {
      var el = inputs[i];
      var ac = (el.getAttribute('autocomplete') || '').toLowerCase();
      var meta = ((el.name || '') + ' ' + (el.id || '') + ' ' + (el.placeholder || '') + ' ' + (el.getAttribute('aria-label') || '')).toLowerCase();
      if (/^cc-(number|csc|exp)/.test(ac) || /card.?(num|no)|cc.?num|cvv|cvc|security code|\b\d{4} \d{4} \d{4} \d{4}\b/.test(meta)) return true;
    }
    return false;
  }
  function countdownPresent() {
    // A countdown is a time-like string that changes between two reads
    var re = /\b\d{1,2}:\d{2}(?::\d{2})?\b/g;
    var first = (visibleText(20000).match(re) || []).join('|');
    return new Promise(function (resolve) {
      if (!first) return resolve(false);
      setTimeout(function () { resolve((visibleText(20000).match(re) || []).join('|') !== first); }, 1150);
    });
  }

  async function collectSignals() {
    var text = visibleText(6000);
    return {
      title: document.title.slice(0, 200),
      has_password_form: !!document.querySelector('input[type="password"]'),
      has_card_form: hasCardForm(),
      has_form: !!document.querySelector('form input, input[type="email"], input[type="tel"]'),
      has_countdown: await countdownPresent(),
      brand_mentions: brandMentions(text),
      text: text.slice(0, 1500) // short snippet for analysis only; never stored
    };
  }

  function localScore(url, ps) {
    var host = location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1';
    var r = isLocal ? { score: 0, reasons: [] } : scoreUrl(url);
    var reg = regDomain(host);
    var mismatch = ps.brand_mentions.length && !ps.brand_mentions.some(function (b) { return (BRANDS[b] || []).indexOf(reg) >= 0; });
    var t = (ps.title + ' ' + ps.text).toLowerCase();
    if (isLocal && mismatch) r.score += 30;
    if ((ps.has_password_form || ps.has_card_form) && mismatch) r.score += 35;
    else if (ps.has_card_form) r.score += 12;
    if (ps.has_countdown) r.score += 15;
    if (/\b(urgent|immediately|within \d+ hours|final notice|expires|last chance|only \d+ \w+ left)\b/.test(t)) r.score += 10;
    if (/\b(redelivery|customs|processing|shipping|handling) fee\b|\bunpaid\b|\bgift ?cards?\b|\bbitcoin\b|\bwire transfer\b/.test(t)) r.score += 15;
    if (/\b(congratulations|you('ve| have)? won|you've been selected|lucky winner|claim your)\b/.test(t)) r.score += 20;
    if (/\bverify your (account|identity)\b/.test(t) && (ps.has_form || ps.has_password_form || ps.has_card_form)) r.score += 20;
    return Math.min(100, r.score);
  }

  // ---------------------------------------------------------------- messaging
  function send(msg) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(msg, function (res) {
          if (chrome.runtime.lastError || !res || !res.ok) return resolve(null);
          resolve(res.data);
        });
      } catch (e) { resolve(null); } // extension reloaded / context invalidated
    });
  }
  function logEvent(type, a) {
    return send({ type: 'event', event: type, risk: a.risk, category: a.category, domain: location.hostname });
  }

  // ---------------------------------------------------------------- UI (Shadow DOM so page CSS can't break it)
  var cssText = null;
  async function css() {
    if (cssText !== null) return cssText;
    try { cssText = await (await fetch(chrome.runtime.getURL('warning.css'))).text(); } catch (e) { cssText = ''; }
    return cssText;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  var ui = { host: null, timer: null };
  function removeUI() {
    if (ui.timer) clearTimeout(ui.timer);
    if (ui.host) ui.host.remove();
    ui.host = null;
    document.documentElement.style.removeProperty('overflow');
  }
  async function mount(id) {
    removeUI();
    var host = document.createElement('hashling-warning');
    host.id = id;
    host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; inset: auto;';
    var root = host.attachShadow({ mode: 'closed' });
    var style = document.createElement('style');
    style.textContent = await css();
    root.appendChild(style);
    document.documentElement.appendChild(host);
    ui.host = host;
    return root;
  }

  function stageFor(user) { return (user && user.stage) || 'cub'; }

  async function showRed(a, user) {
    var root = await mount('hashling-red');
    var conf = Math.round(a.confidence * 100);
    var wrap = document.createElement('div');
    wrap.className = 'hl-overlay';
    wrap.setAttribute('role', 'alertdialog');
    wrap.setAttribute('aria-modal', 'true');
    wrap.setAttribute('aria-labelledby', 'hl-title');
    wrap.innerHTML =
      '<div class="hl-modal">' +
      '  <div class="hl-head">' +
      '    <div class="hl-pet">' + HashlingSVG.build({ stage: stageFor(user), mood: 'alert', equipped: user && user.equipped, size: 150 }) + '</div>' +
      '    <div class="hl-headtext">' +
      '      <div class="hl-badge hl-red">⛔ High risk · ' + a.score + '/100</div>' +
      '      <h1 id="hl-title">Hashling stopped you here!</h1>' +
      '      <p class="hl-cat">This looks like a <b>' + esc(a.category_label) + '</b>.</p>' +
      '      <div class="hl-conf"><span>Confidence</span><div class="hl-bar"><i style="width:' + conf + '%"></i></div><b>' + conf + '%</b></div>' +
      '    </div>' +
      '  </div>' +
      '  <h2>Why Hashling’s fur is standing up</h2>' +
      '  <ol class="hl-reasons">' + a.reasons.slice(0, 3).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      '  <p class="hl-unc"><b>Honest uncertainty:</b> ' + esc(a.uncertainty) + '</p>' +
      '  <h2>What to do</h2>' +
      '  <ul class="hl-steps">' + a.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '  <div class="hl-actions">' +
      '    <button class="hl-safe" data-act="safe">← Back to safety <span>+5 pts</span></button>' +
      '    <button class="hl-ignore" data-act="ignore">I understand the risk, continue</button>' +
      '  </div>' +
      '  <p class="hl-foot">Protected by Hashling · only the warning type and domain are logged, never page content</p>' +
      '</div>';
    root.appendChild(wrap);
    document.documentElement.style.setProperty('overflow', 'hidden', 'important');
    var safeBtn = wrap.querySelector('[data-act="safe"]');
    setTimeout(function () { safeBtn.focus(); }, 50);

    wrap.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return; // simple focus trap
      var btns = wrap.querySelectorAll('button');
      var first = btns[0], last = btns[btns.length - 1];
      if (e.shiftKey && root.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && root.activeElement === last) { e.preventDefault(); first.focus(); }
    });

    safeBtn.addEventListener('click', async function () {
      safeBtn.disabled = true;
      var res = await logEvent('warning_heeded', a);
      var pts = res && res.points_awarded;
      wrap.querySelector('.hl-modal').innerHTML =
        '<div class="hl-done">' + HashlingSVG.build({ stage: stageFor(res ? res.user : user), mood: 'happy', equipped: user && user.equipped, size: 170 }) +
        '<h1>Good call!</h1><p>' + (pts ? '<b class="hl-pts">+' + pts + ' points</b> · ' : '') + 'Hashling is proud of you. A bonus question is waiting in the Den.</p></div>';
      setTimeout(function () {
        if (history.length > 1) { removeUI(); history.back(); }
        else send({ type: 'go-safe' });
      }, 1600);
    });
    wrap.querySelector('[data-act="ignore"]').addEventListener('click', async function () {
      try { sessionStorage.setItem('hashling_ignored:' + location.href, '1'); } catch (e) { /* ignore */ }
      logEvent('warning_ignored', a);
      removeUI();
    });
  }

  async function showYellow(a, user) {
    var root = await mount('hashling-yellow');
    var conf = Math.round(a.confidence * 100);
    var box = document.createElement('div');
    box.className = 'hl-toast';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<div class="hl-toast-row">' +
      '  <div class="hl-face">' + HashlingSVG.build({ stage: stageFor(user), mood: 'alert', equipped: user && user.equipped, size: 64 }) + '</div>' +
      '  <div class="hl-toast-body">' +
      '    <div class="hl-badge hl-yellow">⚠️ Suspicious · ' + a.score + '/100</div>' +
      '    <p class="hl-one">' + esc(a.reasons[0] || 'Hashling noticed something odd on this page.') + '</p>' +
      '    <button class="hl-link" data-act="details" aria-expanded="false">Details</button>' +
      '  </div>' +
      '  <button class="hl-x" data-act="close" aria-label="Dismiss">×</button>' +
      '</div>' +
      '<div class="hl-details" hidden>' +
      '  <p class="hl-cat">' + esc(a.category_label) + ' · ' + conf + '% confidence</p>' +
      '  <ol class="hl-reasons">' + a.reasons.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
      '  <p class="hl-unc">' + esc(a.uncertainty) + '</p>' +
      '  <ul class="hl-steps">' + a.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
      '</div>';
    root.appendChild(box);
    var pinned = false;
    var det = box.querySelector('[data-act="details"]');
    det.addEventListener('click', function () {
      var d = box.querySelector('.hl-details');
      d.hidden = !d.hidden;
      pinned = !d.hidden;
      det.setAttribute('aria-expanded', String(!d.hidden));
      det.textContent = d.hidden ? 'Details' : 'Hide details';
      if (pinned && ui.timer) clearTimeout(ui.timer);
    });
    box.querySelector('[data-act="close"]').addEventListener('click', removeUI);
    ui.timer = setTimeout(function () { if (!pinned) { box.classList.add('hl-out'); setTimeout(removeUI, 400); } }, 12000);
  }

  // ---------------------------------------------------------------- main scan
  var lastScanned = null, rescans = 0, worst = 'safe';

  function shouldSkip() {
    var host = location.hostname;
    if (!/^https?:$/.test(location.protocol)) return true;
    if (location.origin === WEB_ORIGIN || host === '127.0.0.1' && location.port === '5173') {
      // our own site: only scan /demo/* pages (the demo inbox uses email banners instead)
      return !/^\/demo\//.test(location.pathname) || /^\/demo\/inbox/.test(location.pathname);
    }
    if (host === 'localhost' || host === '127.0.0.1') return true; // backend etc.
    if (SAFE.indexOf(regDomain(host)) >= 0) return true;
    try { if (sessionStorage.getItem('hashling_ignored:' + location.href)) return true; } catch (e) { /* ignore */ }
    return false;
  }

  async function scan(reason) {
    if (shouldSkip()) return;
    var url = location.href;
    var ps = await collectSignals();
    if (url !== location.href) return; // navigated while collecting
    var local = localScore(url, ps);
    if (local < LOCAL_THRESHOLD) return; // cheap path: nothing suspicious, never call the backend
    var a = await send({ type: 'analyze-url', url: url, page_signals: ps });
    if (!a || a.risk === 'safe' || url !== location.href) return;
    if (a.risk === 'yellow' && worst !== 'safe') return; // already warned
    if (a.risk === 'red' && worst === 'red') return;
    worst = a.risk;
    var user = await send({ type: 'get-user' });
    logEvent('warning_shown', a);
    if (a.risk === 'red') showRed(a, user); else showYellow(a, user);
  }

  function reset() { removeUI(); worst = 'safe'; rescans = 0; }

  function start() {
    lastScanned = location.href;
    scan('load');
    // Single-page apps: watch for URL changes
    setInterval(function () {
      if (location.href !== lastScanned) { lastScanned = location.href; reset(); setTimeout(function () { scan('nav'); }, 400); }
    }, 700);
    // Re-scan once or twice if forms appear later (e.g. a card form shown after a click)
    var deb = null;
    new MutationObserver(function (muts) {
      if (worst === 'red' || rescans >= 3) return;
      var added = muts.some(function (m) { return Array.prototype.some.call(m.addedNodes, function (n) { return n.nodeType === 1 && n.tagName !== 'HASHLING-WARNING' && (n.matches('form, input') || n.querySelector && n.querySelector('input')); }); });
      if (!added) return;
      clearTimeout(deb);
      deb = setTimeout(function () { rescans++; scan('mutation'); }, 900);
    }).observe(document.documentElement, { childList: true, subtree: true });
  }

  // ---------------------------------------------------------------- keep the extension's active user in sync with the web app
  if (location.origin === WEB_ORIGIN) {
    document.documentElement.dataset.hashlingExtension = '1';
    try {
      var cur = localStorage.getItem('hashling_user');
      if (cur) send({ type: 'set-user', userId: cur });
    } catch (e) { /* ignore */ }
    window.addEventListener('message', function (e) {
      if (e.source === window && e.data && e.data.source === 'hashling-web' && e.data.type === 'active-user') send({ type: 'set-user', userId: e.data.userId });
    });
  }

  // ---------------------------------------------------------------- link-hover tooltips
  // A link is untrusted if its URL scores red locally, or it sits inside an email Hashling flagged red (gmail.js).
  var tip = { host: null, root: null, el: null, link: null };
  async function ensureTip() {
    if (tip.host && tip.host.isConnected) return;
    tip.host = document.createElement('hashling-tip');
    tip.host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0;';
    tip.root = tip.host.attachShadow({ mode: 'closed' });
    var st = document.createElement('style');
    st.textContent = await css();
    tip.root.appendChild(st);
    tip.el = document.createElement('div');
    tip.el.className = 'hl-tip';
    tip.el.setAttribute('role', 'tooltip');
    tip.el.innerHTML = '<span class="hl-face">' + HashlingSVG.build({ stage: 'kitten', mood: 'alert', size: 28, animated: false }) + '</span><span>Hashling doesn’t trust this link</span>';
    tip.el.style.display = 'none';
    tip.root.appendChild(tip.el);
    document.documentElement.appendChild(tip.host);
  }
  function linkIsRed(a) {
    if (!a.href || !/^https?:/i.test(a.href)) return false;
    if (a.closest && a.closest('[data-hashling-risk="red"]')) return true;
    try { if (new URL(a.href).hostname === location.hostname) return false; } catch (e) { return false; }
    return scoreUrl(a.href).score >= 65;
  }
  document.addEventListener('mouseover', async function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (!a || a === tip.link) return;
    tip.link = a;
    if (!linkIsRed(a)) { if (tip.el) tip.el.style.display = 'none'; return; }
    await ensureTip();
    if (tip.link !== a) return;
    var r = a.getBoundingClientRect();
    tip.el.style.display = 'flex';
    tip.el.style.left = Math.max(8, Math.min(r.left, window.innerWidth - 260)) + 'px';
    tip.el.style.top = (r.bottom + 8 > window.innerHeight - 40 ? r.top - 42 : r.bottom + 8) + 'px';
  }, true);
  document.addEventListener('mouseout', function (e) {
    var a = e.target && e.target.closest && e.target.closest('a[href]');
    if (a && a === tip.link && !(e.relatedTarget && a.contains(e.relatedTarget))) {
      tip.link = null;
      if (tip.el) tip.el.style.display = 'none';
    }
  }, true);
  window.addEventListener('scroll', function () { if (tip.el) tip.el.style.display = 'none'; tip.link = null; }, true);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
