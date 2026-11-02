/* VTN Hub – service worker
   Rede primeiro: com internet, sempre carrega a versão mais nova (atualização obrigatória).
   Sem internet, abre a última versão guardada. */
const CACHE = 'vtn-hub-v1';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil((async () => {
  for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
  await self.clients.claim();
})()));
self.addEventListener('fetch', e => {
  const r = e.request; const url = new URL(r.url);
  if (r.method !== 'GET') return;
  const mesmo = url.origin === self.location.origin;
  const cdn = /cdnjs\.cloudflare\.com|unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(url.href);
  if (!mesmo && !cdn) return;   // arquivos da pasta e cotações não passam por aqui
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    try { const resp = await fetch(r, mesmo ? { cache: 'no-store' } : undefined); if (resp && resp.ok) c.put(r, resp.clone()); return resp; }
    catch (err) { const hit = await c.match(r, { ignoreSearch: mesmo }); if (hit) return hit; throw err; }
  })());
});
