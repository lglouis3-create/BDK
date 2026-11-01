// Offline support. Network first (so updates show up right away), cache as the fallback when the
// network fails or answers slower than NET_TIMEOUT.
// lglouis3-create.github.io also serves the other drill sites, and Cache Storage is shared by the whole
// origin, so cleanup deletes only this site's old caches (names starting with PREFIX) and never another
// site's offline copy.
const PREFIX = 'bdk-';
const CACHE = 'bdk-v17';
const NET_TIMEOUT = 3500;
const SHELL = ['./', 'index.html', 'assets/style.css', 'assets/app.js', 'data/decks.json', 'data/glossary.json', 'manifest.webmanifest', 'assets/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  let stored = Promise.resolve();
  const network = fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); stored = caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  });
  const saved = () => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./'));
  // A slow answer still refreshes the cache after the saved copy has been shown.
  e.waitUntil(network.then(() => stored).catch(() => {}));
  e.respondWith(new Promise(resolve => {
    let done = false;
    const answer = r => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => saved().then(answer), NET_TIMEOUT);   // no saved copy yet: keep waiting for the network
    network.then(res => { clearTimeout(timer); answer(res); },
      () => { clearTimeout(timer); saved().then(r => answer(r || Response.error())); });
  }));
});
