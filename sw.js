// ============================================================
// sw.js  —  Service Worker for Cardiac Physical Exam Drill
// Strategy: Cache-First for all local assets
// ============================================================

const CACHE_NAME = 'cardiac-pe-drill-v1';

// ── キャッシュするファイル一覧 ──
// ※ mp4 / mp3 は大容量のためキャッシュ対象外（ネットワーク優先）
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',

  // 画像（問題用）
  '/q34.png',
  '/q35.png',
  '/q51.png',
  '/q79.jpg',
  '/q81.png',
  '/q83.jpg',
  '/q87.png',
  '/q92.jpg',
  '/q96.jpg',
  '/q97.jpg',
  '/q98.jpeg',

  // GIF アイコン
  '/black.gif',
  '/blue.gif',
  '/gold.gif',
  '/green.gif',
  '/red.gif',

  // アプリアイコン
  '/icons/icon-72.png',
  '/icons/icon-96.png',
  '/icons/icon-128.png',
  '/icons/icon-144.png',
  '/icons/icon-152.png',
  '/icons/icon-192.png',
  '/icons/icon-384.png',
  '/icons/icon-512.png',
];

// ── インストール：静的アセットを事前キャッシュ ──
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  // 旧 SW を待たずに即時有効化
  self.skipWaiting();
});

// ── アクティベート：古いキャッシュを削除 ──
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

// ── フェッチ：リクエスト種別に応じた戦略 ──
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // 外部リクエスト（CDN 等）はキャッシュしない
  if (url.origin !== self.location.origin) {
    return;
  }

  // mp4 / mp3 は大容量のためネットワーク優先（キャッシュしない）
  const ext = url.pathname.split('.').pop().toLowerCase();
  if (ext === 'mp4' || ext === 'mp3' || ext === 'wav') {
    event.respondWith(fetch(event.request).catch(() => new Response('')));
    return;
  }

  // それ以外：Cache-First（キャッシュになければネットワーク取得→キャッシュ保存）
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        // 正常なレスポンスのみキャッシュに保存
        if (
          !response ||
          response.status !== 200 ||
          response.type === 'opaque'
        ) {
          return response;
        }

        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseClone);
        });

        return response;
      }).catch(() => {
        // オフライン時：index.html をフォールバック
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        return new Response('', { status: 408 });
      });
    })
  );
});
