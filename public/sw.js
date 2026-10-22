// Offline fallback only. Never cache authenticated HTML, API data or payments.
const CACHE = "papershapers-offline-v1";
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.add("/offline.html")));
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("papershapers-offline-") && key !== CACHE).map((key) => caches.delete(key)))));
});
self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate" || event.request.method !== "GET" || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match("/offline.html").then((response) => response || Response.error())));
});
