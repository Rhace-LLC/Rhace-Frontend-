/**
 * Phase 8: guest stay app service worker (scope: /stay/).
 *
 * - App shell: navigations under /stay/ are network-first, falling back to
 *   the cached shell so the app still opens offline.
 * - Static assets (/assets/*, icons, fonts): stale-while-revalidate.
 * - Catalog + delivery locations: network-first with a cached fallback, so a
 *   guest can browse the menu offline (ordering still needs a connection).
 * - NEVER cached: the bill (folio), orders, session, checkout, payments —
 *   anything about money or identity always comes from the network.
 */
const VERSION = 'stay-v1';
const SHELL_CACHE = `${VERSION}-shell`;
const ASSET_CACHE = `${VERSION}-assets`;
const DATA_CACHE = `${VERSION}-data`;
const SHELL_URL = '/';

const CACHEABLE_API = [/\/stay\/catalog$/, /\/stay\/locations$/];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((cache) => cache.add(new Request(SHELL_URL, { cache: 'reload' })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.startsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request, cacheName, fallbackUrl) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    if (response && response.ok) cache.put(fallbackUrl || request, response.clone());
    return response;
  } catch (error) {
    const cached = await cache.match(fallbackUrl || request);
    if (cached) return cached;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then((response) => {
      if (response && response.ok) cache.put(request, response.clone());
      return response;
    })
    .catch(() => cached);
  return cached || network;
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // App shell for /stay/* navigations (SPA: every route is index.html).
  if (request.mode === 'navigate' && url.origin === self.location.origin && url.pathname.startsWith('/stay/')) {
    event.respondWith(networkFirst(request, SHELL_CACHE, SHELL_URL));
    return;
  }

  // Menu data for offline browsing (API may be on another origin).
  if (CACHEABLE_API.some((re) => re.test(url.pathname))) {
    event.respondWith(networkFirst(request, DATA_CACHE));
    return;
  }

  // Hashed build assets, icons and fonts on our own origin.
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/stay-icons/') || /\.(woff2?|ttf)$/.test(url.pathname))
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
  // Everything else (bill, orders, checkout, payments, sockets) → network only.
});
