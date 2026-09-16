/* Service worker — Viaje a Tailandia
 * Precache del shell. Sin dependencias.
 * sw.js usa sintaxis moderna (const / arrow / async); el IIFE de registro
 * en app.js sigue el estilo var/function del archivo que lo aloja.
 */
'use strict';

const SHELL_CACHE = 'shell-v10';
// Solo se tocan las cachés de este proyecto: en GitHub Pages el origen es
// compartido con otros proyectos del usuario y caches.keys() no está acotado
// por scope.
const OWNED_CACHE = /^shell-v\d+$/;

const SHELL_ASSETS = [
  './',                       // redundante a propósito (red de seguridad);
  './index.html',             // la navegación resuelve contra './index.html'.
  './style.css?v=9',
  './app.js?v=8',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/icon.svg',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/suncalc/suncalc.js',
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
    const keep = [SHELL_CACHE];
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

  // Shell mismo origen: cache-first con fallback a red.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { cacheName: SHELL_CACHE })
        .then(hit => hit || fetch(request))
    );
    return;
  }

  // Cross-origin (Nominatim, Open-Meteo, frankfurter.dev, fotos de Wikimedia): sin interceptar.
});
