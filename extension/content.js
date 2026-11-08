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
  // brand/domain data and the URL rules live in link-safety.js (shared with the link-hover tooltips)
  var LS = window.HashlingLinkSafety;
  var BRANDS = LS.BRANDS;
  var regDomain = LS.regDomain;
  function scoreUrl(url) { return LS.scoreUrl(url, location.href); }
  // phrases that mean "this page claims to be brand X" (fictional + a few real)
  var ALIASES = {
    swiftship: ['swiftship'], megamart: ['megamart', 'mega mart'], northbridge: ['northbridge'], crescentcu: ['crescent credit union'],
    metrotoll: ['metrotoll'], streamly: ['streamly'], cloudnest: ['cloudnest'], paywave: ['paywave'], nimbus: ['nimbus wireless'],
    orbitron: ['orbitron'], coinharbor: ['coinharbor'], hirepath: ['hirepath'], paypal: ['paypal'], amazon: ['amazon'], netflix: ['netflix'],
    microsoft: ['microsoft'], apple: ['apple id', 'icloud'], chase: ['chase bank'], wellsfargo: ['wells fargo'], bankofamerica: ['bank of america'],
    usps: ['usps'], fedex: ['fedex'], dhl: ['dhl'], coinbase: ['coinbase'], binance: ['binance'], venmo: ['venmo'], ebay: ['ebay']
  };

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
  // Hover or keyboard-focus an http(s) link -> small local verdict box (green / yellow / red). Everything runs locally from the
  // address alone (link-safety.js): the destination is never opened and the backend is never asked. It is a quick look at the URL,
  // not a malware scan and not a guarantee. Search-result redirects (Google, Bing, DuckDuckGo) are decoded from the link itself.
  var tip = { host: null, el: null, link: null, seq: 0, building: null };
  var TIP_COLORS = { green: '#3E8E5A', yellow: '#F2B33D', red: '#D9463B' };
  var TIP_ICON = { green: '✓', yellow: '!', red: '✕' };
  // On Hashling's own website only the fake demo pages get tooltips, not the app's normal navigation.
  var tipsEnabled = location.origin !== WEB_ORIGIN || location.pathname.indexOf('/demo') === 0;

  function buildTip() {
    if (tip.building) return tip.building;
    tip.building = (async function () {
      var host = document.createElement('hashling-tip');
      host.style.cssText = 'all: initial; position: fixed; z-index: 2147483647; top: 0; left: 0; width: 0; height: 0; pointer-events: none;';
      var root = host.attachShadow({ mode: 'closed' });
      var st = document.createElement('style');
      st.textContent = await css();
      root.appendChild(st);
      var el = document.createElement('div');
      el.className = 'hl-tip';
      el.setAttribute('role', 'tooltip');
      el.style.display = 'none';
      el.innerHTML = '<span class="hl-tip-icon" aria-hidden="true"></span><span class="hl-tip-body"><b class="hl-tip-title"></b><span class="hl-tip-host"></span><span class="hl-tip-why"></span><span class="hl-tip-note"></span></span>';
      root.appendChild(el);
      tip.host = host; tip.el = el;
    })();
    return tip.building;
  }
  function tipAttach() { if (tip.host && !tip.host.isConnected) (document.documentElement || document.body).appendChild(tip.host); }
  function hideTip() {
    tip.seq++; tip.link = null;
    if (tip.el) tip.el.style.display = 'none';
  }
  function tipLinkFrom(target) {
    var n = target;
    if (n && n.nodeType === 3) n = n.parentElement;
    var a = n && n.closest ? n.closest('a[href], area[href]') : null;
    return a && /^https?:/i.test(a.href || '') ? a : null; // a.href is already resolved to an absolute URL
  }
  function verdictFor(a) {
    // Links inside an email Hashling already flagged red stay red (gmail.js marks the container)
    var inRedMail = a.closest && a.closest('[data-hashling-risk="red"]');
    var v = LS.checkLink(a.href, location.href);
    if (!v) return null;
    if (inRedMail && v.level !== 'red') return { level: 'red', title: 'Dangerous — high-risk link', host: v.host, reason: 'This link is inside an email Hashling flagged as a likely scam.', viaSearch: v.viaSearch };
    return v;
  }
  function placeTip(a) {
    var el = tip.el, r = a.getBoundingClientRect();
    var vw = document.documentElement.clientWidth || window.innerWidth, vh = document.documentElement.clientHeight || window.innerHeight;
    el.style.left = '0px'; el.style.top = '0px'; el.style.display = 'flex'; el.style.visibility = 'hidden';
    var w = el.offsetWidth, h = el.offsetHeight, m = 8;
    var x = Math.max(m, Math.min(r.left, vw - w - m));
    var below = r.bottom + 8, above = r.top - h - 8;
    var y = below + h <= vh - m ? below : (above >= m ? above : Math.max(m, Math.min(below, vh - h - m)));
    el.style.left = Math.round(x) + 'px'; el.style.top = Math.round(y) + 'px'; el.style.visibility = 'visible';
  }
  async function showTip(a) {
    if (!tipsEnabled || a === tip.link) return;
    var my = ++tip.seq;
    tip.link = a;
    var v = verdictFor(a);
    if (!v) { hideTip(); return; }
    await buildTip();
    if (my !== tip.seq || tip.link !== a || !a.isConnected) return; // pointer already moved on / link was removed meanwhile
    tipAttach();
    var el = tip.el, q = function (c) { return el.querySelector(c); };
    el.className = 'hl-tip hl-tip-' + v.level;
    q('.hl-tip-icon').textContent = TIP_ICON[v.level];
    q('.hl-tip-title').textContent = v.title;                                   // textContent only: link text/URLs are never parsed as HTML
    q('.hl-tip-host').textContent = (v.viaSearch ? 'Goes to ' : '') + v.host.slice(0, 80);
    q('.hl-tip-why').textContent = v.level === 'green' ? '' : v.reason;
    q('.hl-tip-note').textContent = 'Quick check of the address only, not a malware scan.';
    el.style.setProperty('--tip-color', TIP_COLORS[v.level]);
    el.setAttribute('aria-label', v.title + '. ' + v.host);
    placeTip(a);
  }

  document.addEventListener('mouseover', function (e) {
    var a = tipLinkFrom(e.composedPath ? e.composedPath()[0] : e.target);
    if (a) showTip(a); else if (tip.link && !(e.relatedTarget && tip.link.contains(e.relatedTarget))) hideTip();
  }, true);
  document.addEventListener('mouseout', function (e) {
    if (!tip.link) return;
    var to = e.relatedTarget;
    if (!to || !tip.link.contains(to)) hideTip();            // left the link (or left the window)
  }, true);
  document.addEventListener('focusin', function (e) { var a = tipLinkFrom(e.composedPath ? e.composedPath()[0] : e.target); if (a) showTip(a); }, true);
  document.addEventListener('focusout', function () { hideTip(); }, true);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && tip.link) hideTip(); }, true); // never stops the page's own Escape handling
  window.addEventListener('scroll', hideTip, true);
  window.addEventListener('resize', hideTip);
  window.addEventListener('blur', hideTip);
  document.addEventListener('visibilitychange', hideTip);
  // links added or removed while the box is open (single-page apps, infinite scroll): drop the box if its link vanished
  new MutationObserver(function () { if (tip.link && !tip.link.isConnected) hideTip(); }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
