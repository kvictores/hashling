/* Hashling background service worker.
 * ALL backend calls go through here (content scripts can't reliably call localhost because of page CORS).
 */
const API = 'http://localhost:8000';
const DEN = 'http://localhost:5173';
const cache = new Map(); // url -> { at, result }   (in-memory, analysis results only)
const CACHE_MS = 5 * 60 * 1000;

async function getUserId() {
  const { userId } = await chrome.storage.local.get('userId');
  return userId || 'maya';
}

async function api(path, opts = {}) {
  const r = await fetch(API + path, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

const post = (path, body) => api(path, { method: 'POST', body: JSON.stringify(body) });

async function handle(msg, sender) {
  switch (msg.type) {
    case 'analyze-url': {
      const key = msg.url + '|' + JSON.stringify(msg.page_signals || {}).length;
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < CACHE_MS) return hit.result;
      const result = await post('/analyze/url', { url: msg.url, page_signals: msg.page_signals });
      cache.set(key, { at: Date.now(), result });
      return result;
    }
    case 'analyze-email':
      return post('/analyze/email', { sender: msg.sender, subject: msg.subject, body: msg.body, links: msg.links || [] });

    case 'event': {
      const userId = await getUserId();
      const res = await post('/events', { user_id: userId, type: msg.event, risk: msg.risk, category: msg.category, domain: msg.domain });
      if (msg.event === 'warning_shown' && msg.risk === 'red' && sender.tab) {
        chrome.action.setBadgeBackgroundColor({ color: '#D9463B', tabId: sender.tab.id });
        chrome.action.setBadgeText({ text: '!', tabId: sender.tab.id });
      }
      return res;
    }

    case 'get-user': {
      const userId = await getUserId();
      return api('/users/' + encodeURIComponent(userId));
    }
    case 'get-users':
      return { users: await api('/users'), active: await getUserId() };
    case 'set-user':
      await chrome.storage.local.set({ userId: msg.userId });
      return { ok: true };
    case 'quiz-status': {
      const userId = await getUserId();
      return api('/quiz/today?user_id=' + encodeURIComponent(userId));
    }

    // "Back to safety" when there's no page to go back to: send the tab to Hashling's Den (a known-safe page)
    case 'go-safe':
      if (sender.tab) await chrome.tabs.update(sender.tab.id, { url: DEN + '/?from=warning' });
      return { ok: true };
    case 'close-tab':
      if (sender.tab) await chrome.tabs.remove(sender.tab.id);
      return { ok: true };
    case 'open-den':
      await chrome.tabs.create({ url: DEN + (msg.path || '/') });
      return { ok: true };
    default:
      throw new Error('Unknown message ' + msg.type);
  }
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  handle(msg, sender)
    .then(data => sendResponse({ ok: true, data }))
    .catch(err => sendResponse({ ok: false, error: String(err && err.message || err) }));
  return true; // async response
});

chrome.runtime.onInstalled.addListener(async () => {
  const { userId } = await chrome.storage.local.get('userId');
  if (!userId) await chrome.storage.local.set({ userId: 'maya' });
});
