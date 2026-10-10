const CACHE_NAME = "shubhshreekh-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(CACHE_NAME));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  // The cache this falls back to is never actually populated (install just
  // opens it, nothing is ever cache.put() into it) — so a plain
  // `.catch(() => caches.match(...))` always resolves to undefined on a
  // real network failure, which turns a transient blip (common on mobile)
  // into a permanently dead page load instead of the browser's own retry/
  // error handling. Fall through to a real Response either way.
  event.respondWith(
    fetch(event.request).catch(
      async () =>
        (await caches.match(event.request)) ??
        new Response("Offline — please check your connection and retry.", {
          status: 503,
          headers: { "Content-Type": "text/plain" },
        })
    )
  );
});
