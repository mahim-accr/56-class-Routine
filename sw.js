

const CACHE_NAME = "routine-cache-v2";

// Adjust this list if your files have different names on the
// server. Keep it relative to where sw.js itself is served from.
const CORE_ASSETS = [
  "./",
  "./routine.html",
  "./manifest.json",
  "./icon-192.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      Promise.all(
        CORE_ASSETS.map((url) =>
          cache.add(url).catch((err) => {
            // Don't let one missing/renamed file break the whole install.
            console.warn("[sw] could not cache", url, err);
          })
        )
      )
    )
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  // Only handle GET requests; let everything else pass through normally.
  if (req.method !== "GET") return;

  // Only handle same-origin requests (don't try to cache/intercept
  // third-party requests like Google Fonts — those already fail
  // gracefully in the page itself when offline).
  if (new URL(req.url).origin !== self.location.origin) return;

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      try {
        const networkResponse = await fetch(req);
        if (networkResponse && networkResponse.status === 200) {
          cache.put(req, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // No network (data off, wifi off, or no signal) — serve
        // whatever we have cached instead.
        const cached = await cache.match(req);
        if (cached) return cached;

        // Navigating to a page we've never cached and have no
        // network for — fall back to the main app shell so the
        // user still lands inside the app instead of an error page.
        if (req.mode === "navigate") {
          const shell = await cache.match("./routine.html");
          if (shell) return shell;
        }
        throw err;
      }
    })
  );
});
