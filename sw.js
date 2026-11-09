// 金融圆桌 Service Worker
// 策略：HTML/导航 → network-only；静态资源 → cache-first（带哈希指纹，天然安全）
// 大体积模型走 jsDelivr CDN（CORS 开放），同样纳入缓存，二次打开秒开
const CACHE = 'roundtable-static-v6';
const CDN_HOST = 'cdn.jsdelivr.net';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 导航与 HTML：始终走网络
  if (req.mode === 'navigate' || url.pathname.endsWith('.html')) return;
  // API 请求不缓存
  if (url.pathname.includes('/chat/completions')) return;
  // 仅缓存同源静态资源与模型 CDN（jsDelivr 带 CORS，响应可缓存）
  const cacheable = url.origin === self.location.origin || url.hostname === CDN_HOST;
  if (!cacheable) return;

  e.respondWith(
    caches.match(req).then(
      (hit) =>
        hit ||
        fetch(req).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE).then((c) => c.put(req, clone));
          }
          return res;
        }),
    ),
  );
});
