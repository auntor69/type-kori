/*
 * The offline service worker.
 *
 * Type Kori is a static site that stores everything on the user's device, so
 * it should keep working with no network at all — on a train, on mobile data,
 * or after the first install. The strategy:
 *
 * - Navigations (page loads) go to the network first so updates arrive on the
 *   next visit, and fall back to the cache, then to the cached home page.
 * - Everything else same-origin (fonts, CSS, JS, icons) is served from the
 *   cache and refreshed in the background (stale-while-revalidate).
 * - One cache per version; activating clears every older one.
 *
 * Registered only in production builds (see BaseLayout.astro): during
 * development the dev server transforms modules on the fly, and caching those
 * would serve stale code after every edit.
 */

const VERSION = "type-kori-v1";

/** The smallest set that makes a cold offline start work. */
const PRECACHE = ["/", "/manifest.webmanifest", "/favicon.svg", "/icon-maskable.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // A page load: network first, cache as the offline fallback, and the cached
  // home page as the last resort for a route that was never visited.
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() =>
          caches
            .match(request)
            .then((hit) => hit ?? caches.match("/"))
            .then((hit) => hit ?? Response.error()),
        ),
    );
    return;
  }

  // An asset: cached copy immediately, network refresh behind it.
  event.respondWith(
    caches.match(request).then((hit) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => hit);
      return hit ?? network;
    }),
  );
});
