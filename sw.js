// Otterpreter Service Worker — offline-first caching
const CACHE = h'otterpreter-v2';
const ASSETS = [
  '/otterpreter/',
  '/otterpreter/index.html',
  '/otterpreter/manifest.json',
  '/otterpreter/icon-192.png',
  '/otterpreter/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(resp => {
      if (resp && resp.status === 200 && e.request.method === 'GET') {
        const clone = resp.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
      }
      return resp;
    }).catch(() => caches.match('/otterpreter/index.html')))
  );
});
