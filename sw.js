const CACHE = "ipgomi-v259";
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js",
  "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.includes("geocode") || url.hostname.includes("workers.dev")) return;
  // 카카오/다음 지도(SDK·타일·API)는 SW가 가로채지 않고 네트워크 직접 처리
  if (url.hostname.includes("kakao.com") || url.hostname.includes("kakaocdn.net") || url.hostname.includes("daumcdn.net") || url.hostname.includes("daum.net")) return;

  // HTML / index / data 는 network-first (오프라인 시만 캐시 사용)
  const isHTML = e.request.mode === "navigate" ||
                 url.pathname.endsWith("/") ||
                 url.pathname.endsWith(".html") ||
                 url.pathname.endsWith(".json") ||
                 url.pathname.endsWith(".enc") ||
                 url.pathname.endsWith(".js");
  if (isHTML) {
    e.respondWith(
      fetch(e.request).then(res => {
        if (res.ok && e.request.method === "GET") {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }
  // 그 외 정적 자산(png, css, font 등) 은 cache-first
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok && e.request.method === "GET") {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
      }
      return res;
    }).catch(() => cached))
  );
});
