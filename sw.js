const CACHE_NAME = 'tetris-pwa-v2';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './game.js',
  './audio.js',
  './manifest.json',
  './icon.svg',
  'https://unpkg.com/mqtt@5.15.2/dist/mqtt.min.js',
  'https://unpkg.com/peerjs@1.4.7/dist/peerjs.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => {
      return response || fetch(e.request).catch(() => {
        // Fallback for offline mode if fetch fails
      });
    })
  );
});
