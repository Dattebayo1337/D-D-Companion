/* Only the static reader is cached. Never cache account pages, APIs or campaigns. */
const CACHE = "companion-reader-v1";
const ASSETS = ["/offline.html", "/offline-reader.js", "/offline-reader.css"];
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("companion-reader-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin || event.request.method !== "GET")
    return;
  if (ASSETS.includes(url.pathname)) {
    event.respondWith(
      caches.open(CACHE).then(async (cache) => {
        try {
          const response = await fetch(event.request);
          if (response.ok && !response.redirected) {
            await cache.put(url.pathname, response.clone());
            return response;
          }
        } catch {
          /* Offline copy follows. */
        }
        return (await cache.match(url.pathname)) || Response.error();
      }),
    );
  } else if (event.request.mode === "navigate" && url.pathname === "/") {
    event.respondWith(
      fetch(event.request).catch(
        async () => (await caches.match("/offline.html")) || Response.error(),
      ),
    );
  }
});
