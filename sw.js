// Firefly Service Worker — offline-first for app shell
const CACHE = 'firefly-v2';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // 只攔截同源 GET；API 呼叫（GitHub/Groq/Gemini/Worker）一律直連
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  const isNav = e.request.mode === 'navigate';
  // 導航請求一律以 './' 作快取鍵 — 捷徑帶嘅 ?add=1&url=... 唔會各自產生永久快取
  const cacheKey = isNav ? './' : e.request;
  e.respondWith(
    fetch(e.request).then(res => {
      // 只快取成功回應，避免離線時派發快取咗嘅錯誤頁
      if (res.ok) {
        const copy = res.clone();
        e.waitUntil(caches.open(CACHE).then(c => c.put(cacheKey, copy)).catch(() => {}));
      }
      return res;
    }).catch(() =>
      caches.match(cacheKey, { ignoreSearch: true })
        .then(hit => hit || (isNav ? caches.match('./') : Response.error()))
    )
  );
});
