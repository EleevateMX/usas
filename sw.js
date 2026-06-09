// ===========================================================================
//  USMS Control — Service Worker (PWA)
//  Shell cache + stale-while-revalidate para recursos propios. Las llamadas a
//  Supabase y CDNs van siempre a la red (datos frescos).
// ===========================================================================
const VERSION = 'usms-v5';
const SHELL = [
  './', './index.html', './examen.html', './academia.html', './manifest.json',
  './assets/css/styles.css',
  './assets/manuales/introduccion.md', './assets/manuales/imagen.md',
  './assets/manuales/comunicaciones.md', './assets/manuales/unidades.md',
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

// --------------------------- Notificaciones push ---------------------------
self.addEventListener('push', (e) => {
  let data = {};
  try { data = e.data ? e.data.json() : {}; } catch { data = { body: e.data ? e.data.text() : '' }; }
  const title = data.title || 'U.S. Marshals Service';
  e.waitUntil(self.registration.showNotification(title, {
    body: data.body || '',
    icon: './assets/img/icon-192.png',
    badge: './assets/img/favicon.png',
    data: { url: data.url || '#/dashboard' },
    vibrate: [80, 40, 80],
    tag: data.tag || undefined,
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const ruta = (e.notification.data && e.notification.data.url) || '#/dashboard';
  const dest = ruta.startsWith('#') ? './' + ruta : ruta;
  e.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) {
      if ('focus' in c) {
        await c.focus();
        if (ruta.startsWith('#') && 'navigate' in c) { try { await c.navigate(c.url.split('#')[0] + ruta); } catch { /* noop */ } }
        return;
      }
    }
    await self.clients.openWindow(dest);
  })());
});
