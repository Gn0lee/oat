self.addEventListener("install", (_event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener("fetch", (_event) => {
  // PWA 설치 요건 충족을 위한 빈 fetch 핸들러
  // 향후 오프라인 캐싱 로직을 여기에 추가할 수 있습니다.
});
