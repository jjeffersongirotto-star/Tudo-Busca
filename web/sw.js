/* Service worker do Tudo-Busca: deixa o app abrir sem internet com os últimos dados vistos. */
const CACHE = 'tudo-busca-v1';
const BASE = ['/', '/manifest.webmanifest', '/icones/icon-192.png', '/icones/icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return;           // fotos das lojas e POST: direto na rede
  if (u.pathname === '/api/status' || u.pathname === '/api/atualizar') return;       // andamento da coleta: sempre ao vivo
  // página e dados: tenta a rede primeiro; sem internet, usa a última cópia guardada
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copia = r.clone(); caches.open(CACHE).then(c => c.put(u.pathname === '/' ? '/' : e.request, copia)); }
    return r;
  }).catch(() => caches.match(u.pathname === '/' ? '/' : e.request)));
});
