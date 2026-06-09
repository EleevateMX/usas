// ===========================================================================
//  USMS Control — Service Worker (PWA)
//  Shell cache + stale-while-revalidate para recursos propios. Las llamadas a
//  Supabase y CDNs van siempre a la red (datos frescos).
// ===========================================================================
const VERSION = 'usms-v2';
const SHELL = [
  './', './index.html', './examen.html', './manifest.json',
  './assets/css/styles.css',
  './assets/img/usms-seal.png', './assets/img/usms-seal.svg',
  './assets/img/favicon.png', './assets/img/icon-192.png', './assets/img/icon-512.png',
  './assets/img/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Otros orígenes (Supabase, esm.sh, Google Fonts): red directa, sin cachear datos.
  if (url.origin !== self.location.origin) return;

  // Mismo origen: stale-while-revalidate.
  e.respondWith(
    caches.open(VERSION).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') cache.put(req, res.clone());
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
