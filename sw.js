// ============================================================
// sw.js  —  Service Worker for Cardiac Physical Exam Drill
// Cache-First for static assets / Network-only for mp4・mp3
// ============================================================

const CACHE_NAME = 'cardiac-pe-drill-v2';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',

  // GIF icons
  '/black.gif',
  '/blue.gif',
  '/gold.gif',
  '/green.gif',
  '/red.gif',

  // Question images (exact filenames confirmed on GitHub)
  '/q34.png',
  '/q35.png',
  '/q51.png',
  '/q79.jpg',
  '/q81.jpg',
  '/q83.jpg',
  '/q87.png',
  '/q92.jpg',
  '/q96.jpg',
  '/q97.jpg',
  '/q98.jpeg',
  '/q50.jpeg',
  '/q100.jpg',

  // App icons
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',

  // Screenshots
  '/screenshots/screen1.png',
  '/screenshots/screen2.png',
  '/screenshots/screen3.png',
  '/screenshots/screen4.png',
  '/screenshots/screen5.png',
];

// インストール
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        PRECACHE_ASSETS.map((url) =>
          cache.add(url).catch((e) =>
            console.warn('[SW] Precache failed:', url, e)
          )
        )
      );
    })
  );
  self.skipWaiting();
});

// アクティベート：古いキャッシュを削除
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// フェッチ
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 外部リクエストはスルー
  if (url.origin !== self.location.origin) return;

  const ext = url.pathname.split('.').pop().toLowerCase();

  // mp4・mp3・wav はネットワーク直接（大容量のためキャッシュしない）
  if (ext === 'mp4' || ext === 'mp3' || ext === 'wav') {
    event.respondWith(
      fetch(event.request).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // それ以外：Cache-First
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});
