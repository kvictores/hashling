// Run with:  node --test extension/tests/   (Node 18+; no packages needed)
const test = require('node:test');
const assert = require('node:assert/strict');
const LS = require('../link-safety.js');

const level = (href) => LS.checkLink(href, 'https://example.org/').level;
const b64u = (s) => Buffer.from(s).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

test('ordinary https links on known sites are green', () => {
  assert.equal(level('https://www.wikipedia.org/wiki/Cat'), 'green');
  assert.equal(level('https://github.com/anthropics'), 'green');
});
test('plain unknown https site is green and says so honestly', () => {
  const r = LS.checkLink('https://example.com/page');
  assert.equal(r.level, 'green');
  assert.match(r.title, /^Safe — no obvious URL risks/);
});
test('lookalike brand domains are flagged (red when several signals stack, caution for a lone lookalike)', () => {
  assert.equal(level('https://paypa1-secure.top/login'), 'red');
  assert.equal(level('https://northbrigdebank.com/'), 'yellow');
});
test('raw IP addresses and @ tricks are not green', () => {
  assert.notEqual(level('http://192.168.4.4/login'), 'green');
  assert.notEqual(level('https://paypal.com@evil.example/x'), 'green');
});
test('plain http is caution, not safe', () => {
  assert.equal(level('http://example.com/'), 'yellow');
});
test('shorteners are caution, never automatically safe', () => {
  assert.equal(level('https://bit.ly/abc123'), 'yellow');
  assert.equal(level('https://t.co/xyz'), 'yellow');
});
test('non-http(s) links get no tooltip', () => {
  assert.equal(LS.checkLink('mailto:a@b.com'), null);
  assert.equal(LS.checkLink('javascript:alert(1)'), null);
  assert.equal(LS.checkLink('tel:123'), null);
  assert.equal(LS.checkLink('not a url at all', undefined), null);
});
test('Google result redirect: destination is inspected and its hostname shown', () => {
  const bad = LS.checkLink('https://www.google.com/url?sa=t&q=' + encodeURIComponent('https://paypa1-secure.top/login'));
  assert.equal(bad.level, 'red');
  assert.equal(bad.host, 'paypa1-secure.top');
  const good = LS.checkLink('https://www.google.com/url?q=' + encodeURIComponent('https://en.wikipedia.org/wiki/Cat'));
  assert.equal(good.level, 'green');
  assert.equal(good.host, 'en.wikipedia.org');
});
test('Bing result redirect (ck/a with a1 base64url) is decoded', () => {
  const dest = 'https://metrotoll-pay.icu/pay';
  const r = LS.checkLink('https://www.bing.com/ck/a?!&&p=abc&u=a1' + b64u(dest) + '&ntb=1');
  assert.equal(r.host, 'metrotoll-pay.icu');
  assert.notEqual(r.level, 'green');
  const ok = LS.checkLink('https://www.bing.com/ck/a?u=a1' + b64u('https://www.nytimes.com/'));
  assert.equal(ok.level, 'green');
});
test('DuckDuckGo redirect is decoded', () => {
  const r = LS.checkLink('https://duckduckgo.com/l/?uddg=' + encodeURIComponent('https://cloudnest.mail-upgrade.top/x'));
  assert.equal(r.host, 'cloudnest.mail-upgrade.top');
  assert.equal(r.level, 'yellow'); // score 62: brand misuse + scam-style ending, just under the shared 65 high-risk line
});
test('unresolved search redirects are caution, not safe', () => {
  assert.equal(level('https://www.google.com/url?sa=t'), 'yellow');
  assert.equal(level('https://www.bing.com/ck/a?u=garbage'), 'yellow');
  assert.equal(level('https://www.google.com/url?q=javascript:alert(1)'), 'yellow');
});
test('nested redirect chains beyond the limit are caution', () => {
  let u = 'https://example.net/';
  for (let i = 0; i < 5; i++) u = 'https://www.google.com/url?q=' + encodeURIComponent(u);
  assert.equal(level(u), 'yellow');
});
test('a lookalike "google" domain cannot vouch for its destination', () => {
  const r = LS.checkLink('https://google.xyz/url?q=' + encodeURIComponent('https://en.wikipedia.org/'));
  assert.notEqual(r.level, 'green');
  assert.equal(r.host, 'google.xyz');
});
test('weird input never throws', () => {
  for (const h of ['', 'http://', 'https://[::1', 'https://' + 'a'.repeat(5000) + '.com', 'https://xn--pypal-4ve.com/', '//evil.top/x']) {
    assert.doesNotThrow(() => LS.checkLink(h, 'https://example.org/'));
  }
  assert.equal(LS.checkLink('//evil.top/x', 'https://example.org/').host, 'evil.top');
});
test('punycode hostnames are flagged', () => {
  assert.notEqual(level('https://xn--pypal-4ve.com/'), 'green');
});
