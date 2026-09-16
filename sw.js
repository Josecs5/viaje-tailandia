/* Service worker — Viaje a Tailandia
 * Precache del shell y caché de tiles del mapa al usarlos. Sin dependencias.
 * sw.js usa sintaxis moderna (const / arrow / async); el IIFE de registro
 * en app.js sigue el estilo var/function del archivo que lo aloja.
 */
'use strict';

const SHELL_CACHE = 'shell-v4';
const TILE_CACHE  = 'tiles-v2';
const TILE_MAX = 300;
// Solo se tocan las cachés de este proyecto: en GitHub Pages el origen es
// compartido con otros proyectos del usuario y caches.keys() no está acotado
// por scope.
const OWNED_CACHE = /^(shell|tiles)-v\d+$/;

// Mapa base real de la app: CARTO. OpenStreetMap es solo el fallback tras
// varios tileerror (ver app.js). Se reconocen los dos.
function isTile(url) {
  return /(^|\.)basemap\.cartocdn\.com$/.test(url.hostname)
      || /(^|\.)tile\.openstreetmap\.org$/.test(url.hostname);
}

async function trimTileCache() {
  const cache = await caches.open(TILE_CACHE);
  const keys = await cache.keys();
  if (keys.length <= TILE_MAX) return;
  const excess = keys.slice(0, keys.length - TILE_MAX);
  await Promise.all(excess.map(req => cache.delete(req)));
}

async function tileFetch(request) {
  const cache = await caches.open(TILE_CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  try {
    const res = await fetch(request);
    // Los tiles se piden con CORS (crossOrigin en app.js), así que la respuesta
    // trae status real: un 4xx/5xx no se cachea.
    if (res && res.ok) {
      try {
        await cache.put(request, res.clone());
      } catch (e) { /* quota u otro: se responde igualmente */ }
      trimTileCache().catch(() => {});   // también tras un fallo de put (libera hueco)
    }
    return res;
  } catch (e) {
    // Sin caché y fetch fallido: propagar el error para que Leaflet dispare
    // 'tileerror' (paso de CARTO a OSM, y su errorTileUrl transparente).
    return Response.error();
  }
}

const SHELL_ASSETS = [
  './',                       // redundante a propósito (red de seguridad);
  './index.html',             // la navegación resuelve contra './index.html'.
  './style.css?v=4',
  './app.js?v=4',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/suncalc/suncalc.js',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/fonts/fonts.css',
  './vendor/fonts/space-grotesk-500.woff2',
  './vendor/fonts/space-grotesk-600.woff2',
  './vendor/fonts/space-grotesk-700.woff2',
  './vendor/fonts/inter-400.woff2',
  './vendor/fonts/inter-500.woff2',
  './vendor/fonts/inter-600.woff2',
  './vendor/fonts/inter-700.woff2',
  './vendor/fonts/ibm-plex-mono-400.woff2',
  './vendor/fonts/ibm-plex-mono-500.woff2'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then(cache => cache.addAll(
      // 'reload' evita que un asset servido rancio por la caché HTTP del
      // navegador quede horneado en el precache del SW.
      SHELL_ASSETS.map(u => new Request(u, { cache: 'reload' }))
    ))
  );
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = [SHELL_CACHE, TILE_CACHE];
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(n => OWNED_CACHE.test(n) && !keep.includes(n))
        .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  // Navegación: cache-first contra index.html (arranque offline instantáneo).
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html', { cacheName: SHELL_CACHE })
        .then(hit => hit || fetch(request))
    );
    return;
  }

  // Tiles del mapa (CARTO, u OSM de fallback): cache-first en tiles-v1.
  if (isTile(url)) {
    event.respondWith(tileFetch(request));
    return;
  }

  // Shell mismo origen: cache-first con fallback a red.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { cacheName: SHELL_CACHE })
        .then(hit => hit || fetch(request))
    );
    return;
  }

  // Cross-origin no-tile (Nominatim, Open-Meteo, frankfurter.dev): sin interceptar.
});
