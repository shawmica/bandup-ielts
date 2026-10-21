// Offline cache: the whole app is ~180 KB, so it is cached on first visit and then
// works without mobile data (useful during connectivity drops and power cuts).
const CACHE = 'bandup-v4';
const FILES = ['./', 'index.html', 'css/styles.css', 'js/content.js', 'js/engine.js', 'js/app.js', 'manifest.webmanifest', 'icon.svg'];
// cache: 'reload' skips the browser's HTTP cache (GitHub Pages sends max-age=600),
// so a new version never stores the previous version's files.
self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES.map(f => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request).then(res => {
    const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); return res;
  }).catch(() => caches.match('index.html'))));
});
