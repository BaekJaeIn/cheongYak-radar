// 청약레이더 서비스워커 (수동, BR-U5-5/6). 앱셸 캐시 + Web Push 수신.
const CACHE = "cheongyak-v1";
const SHELL = ["/", "/bookmarks", "/settings"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

// 네비게이션: 네트워크 우선, 실패 시 캐시(오프라인).
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || caches.match("/"))));
  }
});

// Web Push 수신 → 알림 표시 (US-5.4).
self.addEventListener("push", (e) => {
  let data = { title: "청약레이더", body: "새 추천이 있어요", url: "/" };
  try {
    if (e.data) data = { ...data, ...e.data.json() };
  } catch (_) {}
  e.waitUntil(
    self.registration.showNotification(data.title, { body: data.body, data: { url: data.url } }),
  );
});

self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(
    self.clients.matchAll({ type: "window" }).then((list) => {
      for (const c of list) {
        if ("focus" in c) return c.focus();
      }
      return self.clients.openWindow(url);
    }),
  );
});
