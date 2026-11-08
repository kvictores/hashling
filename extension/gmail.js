/* Hashling email flagging. Runs on mail.google.com and the demo inbox (localhost:5173/demo/inbox).
 * When an email is opened: extract sender, subject, body text and links -> /analyze/email (via background.js)
 * -> inject a red/yellow/green banner at the top of the message. Nothing is stored.
 *
 * Gmail's DOM is undocumented and changes often, so ALL selectors live in SITES below, and every step is wrapped
 * in try/catch. The demo inbox is the reliable path.
 */
(function () {
  'use strict';
  if (window.top !== window || window.__hashlingMail) return;
  window.__hashlingMail = true;

  var SITES = {
    demo: {
      match: function () { return location.origin === 'http://localhost:5173' && /^\/demo\/inbox/.test(location.pathname); },
      message: '[data-hashling-email]',
      subject: '[data-email-subject]',
      sender: '[data-email-sender]',
      senderEmailAttr: null,
      body: '[data-email-body]',
      insertBefore: '[data-email-subject]'
    },
    gmail: {
      match: function () { return location.hostname === 'mail.google.com'; },
      message: 'div.adn',            // one expanded message in a thread
      subject: 'h2.hP',              // thread subject (lives outside the message, looked up on document)
      subjectScope: 'document',
      sender: 'span.gD',             // sender name; email address is in the "email" attribute
      senderEmailAttr: 'email',
      body: 'div.a3s',               // message body
      insertBefore: null             // insert at the top of the message container
    }
  };

  function site() {
    for (var k in SITES) { try { if (SITES[k].match()) return SITES[k]; } catch (e) { /* ignore */ } }
    return null;
  }

  function send(msg) {
    return new Promise(function (resolve) {
      try {
        chrome.runtime.sendMessage(msg, function (res) {
          if (chrome.runtime.lastError || !res || !res.ok) return resolve(null);
          resolve(res.data);
        });
      } catch (e) { resolve(null); }
    });
  }

  var cssText = null;
  async function css() {
    if (cssText !== null) return cssText;
    try { cssText = await (await fetch(chrome.runtime.getURL('warning.css'))).text(); } catch (e) { cssText = ''; }
    return cssText;
  }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]; }); }

  function extract(cfg, msgEl) {
    var scope = cfg.subjectScope === 'document' ? document : msgEl;
    var subjEl = scope.querySelector(cfg.subject);
    var senderEl = msgEl.querySelector(cfg.sender);
    var bodyEl = msgEl.querySelector(cfg.body);
    if (!bodyEl) return null;
    var sender = '';
    if (senderEl) {
      var addr = cfg.senderEmailAttr ? senderEl.getAttribute(cfg.senderEmailAttr) : '';
      sender = (senderEl.textContent || '').replace(/\s+/g, ' ').trim();
      if (addr && sender.indexOf(addr) < 0) sender += ' <' + addr + '>';
    }
    var links = Array.prototype.map.call(bodyEl.querySelectorAll('a[href]'), function (a) { return a.href; })
      .filter(function (h) { return /^https?:/.test(h); }).slice(0, 30);
    var body = (bodyEl.innerText || '').trim().slice(0, 8000);
    // include attachment names that sit next to the body in many clients
    return { sender: sender, subject: subjEl ? subjEl.textContent.trim() : '', body: body, links: links };
  }

  var done = new WeakMap(); // message element -> key already analyzed

  async function process(cfg, msgEl) {
    var data;
    try { data = extract(cfg, msgEl); } catch (e) { return; }
    if (!data || (!data.body && !data.subject)) return;
    var key = data.sender + '|' + data.subject + '|' + data.body.length;
    if (done.get(msgEl) === key) return;
    done.set(msgEl, key);

    var a = await send({ type: 'analyze-email', sender: data.sender, subject: data.subject, body: data.body, links: data.links });
    if (!a || !msgEl.isConnected) return;
    var user = await send({ type: 'get-user' });
    try {
      msgEl.setAttribute('data-hashling-risk', a.risk); // lets link-hover tooltips distrust links in flagged emails
      inject(cfg, msgEl, a, user, data);
    } catch (e) { /* selectors drifted: fail quietly */ }
    if (a.risk !== 'safe') {
      send({ type: 'event', event: 'warning_shown', risk: a.risk, category: a.category, domain: senderDomain(data.sender) });
    }
  }

  function senderDomain(s) { var m = /@([a-z0-9.-]+)/i.exec(s || ''); return m ? m[1].toLowerCase() : ''; }

  async function inject(cfg, msgEl, a, user, data) {
    var old = msgEl.querySelector('hashling-banner');
    if (old) old.remove();
    var host = document.createElement('hashling-banner');
    host.style.cssText = 'all: initial; display: block;';
    var root = host.attachShadow({ mode: 'closed' });
    var style = document.createElement('style');
    style.textContent = await css();
    root.appendChild(style);

    var mood = a.risk === 'safe' ? 'happy' : 'alert';
    var title = a.risk === 'red' ? 'Hashling thinks this email is a scam' : a.risk === 'yellow' ? 'Hashling is suspicious of this email' : 'Hashling didn’t find scam signals';
    var badge = a.risk === 'red' ? '<span class="hl-badge hl-red">⛔ High risk</span>' : a.risk === 'yellow' ? '<span class="hl-badge hl-yellow">⚠️ Suspicious</span>' : '<span class="hl-badge hl-safe-badge">✓ Looks safe</span>';
    var conf = Math.round(a.confidence * 100);
    var div = document.createElement('div');
    div.className = 'hl-banner ' + a.risk;
    div.setAttribute('role', a.risk === 'red' ? 'alert' : 'status');
    div.innerHTML =
      '<div class="hl-face">' + HashlingSVG.build({ stage: (user && user.stage) || 'cub', mood: mood, equipped: user && user.equipped, size: 56 }) + '</div>' +
      '<div class="hl-banner-body">' + badge +
      '  <div class="hl-banner-title">' + title + (a.risk !== 'safe' ? ' · ' + esc(a.category_label) : '') + ' <span style="font-weight:500;color:#5F6F64">(' + conf + '% confidence)</span></div>' +
      (a.risk !== 'safe'
        ? '<ol class="hl-reasons">' + a.reasons.slice(0, 3).map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol>' +
          '<ul class="hl-steps">' + a.next_steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ul>' +
          '<p class="hl-unc">' + esc(a.uncertainty) + '</p>' +
          '<div class="hl-banner-actions"><button class="hl-btn-small" data-act="heed">Got it, I won’t click <span style="opacity:.8">+5</span></button>' +
          '<button class="hl-btn-small ghost" data-act="dismiss">Dismiss</button></div>'
        : '<p style="margin:2px 0 0;font-size:13.5px;color:#5F6F64">' + esc(a.uncertainty) + '</p>') +
      '</div>';
    root.appendChild(div);

    var heed = div.querySelector('[data-act="heed"]');
    if (heed) heed.addEventListener('click', async function () {
      heed.disabled = true;
      var res = await send({ type: 'event', event: 'warning_heeded', risk: a.risk, category: a.category, domain: senderDomain(data.sender) });
      heed.textContent = res && res.points_awarded ? '+' + res.points_awarded + ' points · Hashling is proud of you!' : 'Thanks! Hashling is proud of you.';
    });
    var dis = div.querySelector('[data-act="dismiss"]');
    if (dis) dis.addEventListener('click', function () { host.remove(); });

    var before = cfg.insertBefore && msgEl.querySelector(cfg.insertBefore);
    if (before && before.parentNode) before.parentNode.insertBefore(host, before);
    else msgEl.insertBefore(host, msgEl.firstChild);
  }

  function scanAll() {
    var cfg = site();
    if (!cfg) return;
    try {
      document.querySelectorAll(cfg.message).forEach(function (el) { process(cfg, el); });
    } catch (e) { /* ignore */ }
  }

  var deb = null;
  function schedule() { clearTimeout(deb); deb = setTimeout(scanAll, 350); }

  new MutationObserver(function (muts) {
    // ignore our own banner insertions
    for (var i = 0; i < muts.length; i++) {
      var t = muts[i].target;
      if (t && t.nodeName !== 'HASHLING-BANNER') { schedule(); return; }
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  scanAll();
})();
