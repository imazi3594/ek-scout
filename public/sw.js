const CACHE = "ek-scout-v5";
const NETWORK_TIMEOUT = 2500;

const PRECACHE = [
  "index.html",
  "manifest.json",
  "favicon.svg",
  "apple-touch-icon.png",
  "units/bow.png",
  "units/cavalry.png",
  "units/gun.png",
  "units/spear.png",
  "units/sword.png",
];

function timeoutFetch(request, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function cachePut(request, response) {
  if (!response || !response.ok) return;
  const cache = await caches.open(CACHE);
  await cache.put(request, response.clone());
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const base = self.registration.scope;
      await Promise.all(
        PRECACHE.map((path) => cache.add(new URL(path, base).href).catch(() => undefined)),
      );
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      const navigate = event.request.mode === "navigate";
      const shell = () => caches.match(new URL("index.html", self.registration.scope).href);

      if (self.navigator.onLine === false) {
        if (cached) return cached;
        if (navigate) {
          const fallback = await shell();
          if (fallback) return fallback;
        }
        return new Response("", { status: 503, statusText: "offline" });
      }

      if (cached && !navigate) return cached;

      try {
        const fresh = await timeoutFetch(event.request, NETWORK_TIMEOUT);
        if (fresh && fresh.ok) {
          event.waitUntil(cachePut(event.request, fresh));
          return fresh;
        }
        if (cached) return cached;
        return fresh;
      } catch {
        if (cached) return cached;
        if (navigate) {
          const fallback = await shell();
          if (fallback) return fallback;
        }
        return new Response("", { status: 503, statusText: "offline" });
      }
    })(),
  );
});
