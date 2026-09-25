const CACHE = "ek-scout-v6";
const NETWORK_TIMEOUT = 2500;

const PRECACHE = [
  "index.html",
  "manifest.json",
  "manifest.webmanifest",
  "favicon.svg",
  "apple-touch-icon.png",
  "icons/icon-192.png",
  "icons/icon-512.png",
  "icons/maskable-512.png",
  "units/bow.png",
  "units/cavalry.png",
  "units/gun.png",
  "units/spear.png",
  "units/sword.png",
];

function timeoutFetch(request, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return Promise.race([
    fetch(request, { signal: ctrl.signal }),
    new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms + 100)),
  ]).finally(() => clearTimeout(timer));
}

/** Cache Storage rejects redirected responses, and GitHub Pages redirects. Copy the body. */
async function materialize(response) {
  const headers = new Headers(response.headers);
  headers.delete("content-encoding");
  headers.delete("content-length");
  const body = await response.blob();
  return new Response(body, { status: response.status, statusText: response.statusText, headers });
}

async function precacheShell() {
  const cache = await caches.open(CACHE);
  const base = self.registration.scope;
  const indexUrl = new URL("index.html", base).href;
  let html = "";
  try {
    const indexRes = await fetch(indexUrl, { cache: "reload" });
    if (indexRes.ok) html = await indexRes.text();
  } catch {
    return false;
  }
  if (!html) return false;

  const urls = new Set(PRECACHE.map((path) => new URL(path, base).href));
  if (html) {
    const attr = /(?:src|href)="([^"]+)"/g;
    let match;
    while ((match = attr.exec(html))) {
      const href = match[1];
      if (!href || href.startsWith("data:") || href.startsWith("https:") || href.startsWith("http:")) continue;
      urls.add(new URL(href, indexUrl).href);
    }
  }

  const downloaded = [];
  await Promise.all(
    [...urls].map(async (url) => {
      if (url === indexUrl || url === base) return;
      try {
        const res = await fetch(url, { cache: "reload" });
        if (res.ok) downloaded.push([url, await materialize(res)]);
      } catch {
        /* skip missing files */
      }
    }),
  );
  for (const [url, response] of downloaded) await cache.put(url, response);
  const scriptReady = downloaded.some(([url]) => /\/assets\/.+\.js$/.test(url));
  if (!scriptReady) return false;
  const page = () => new Response(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
    await cache.put(indexUrl, page());
    await cache.put(base, page());
    await cache.put(new URL("./", base).href, page());
  return true;
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const ready = await precacheShell();
      if (ready) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const base = self.registration.scope;
      const hasShell = await cache.match(base);
      if (!hasShell) return;
      const keys = await caches.keys();
      await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

async function cached(request) {
  return (
    (await caches.match(request)) ||
    (await caches.match(request, { ignoreSearch: true })) ||
    null
  );
}

async function shell() {
  const base = self.registration.scope;
  return (
    (await caches.match(base)) ||
    (await caches.match(new URL("index.html", base).href)) ||
    (await caches.match(new URL("./", base).href)) ||
    null
  );
}

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const hit = await cached(event.request);
      const navigate = event.request.mode === "navigate";

      if (hit) {
        if (navigate && self.navigator.onLine !== false) {
          event.waitUntil(precacheShell().catch(() => undefined));
        }
        return hit;
      }

      if (self.navigator.onLine === false) {
        if (navigate) {
          const fallback = await shell();
          if (fallback) return fallback;
        }
        return new Response("", { status: 503, statusText: "offline" });
      }

      try {
        const fresh = await timeoutFetch(event.request, NETWORK_TIMEOUT);
        if (fresh && fresh.ok) {
          const copy = await materialize(fresh);
          const cache = await caches.open(CACHE);
          event.waitUntil(cache.put(event.request, copy.clone()).catch(() => undefined));
          if (navigate) event.waitUntil(precacheShell().catch(() => undefined));
          return copy;
        }
        if (navigate) {
          const fallback = await shell();
          if (fallback) return fallback;
        }
        return fresh;
      } catch {
        if (navigate) {
          const fallback = await shell();
          if (fallback) return fallback;
        }
        return new Response("", { status: 503, statusText: "offline" });
      }
    })(),
  );
});
