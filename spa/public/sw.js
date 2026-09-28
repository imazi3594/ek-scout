const CACHE = "ek-scout-v7";
const NETWORK_TIMEOUT = 2500;
const REVALIDATE_TIMEOUT = 6000;

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
  const init = { signal: ctrl.signal };
  if (typeof request === "string") init.cache = "reload";
  return Promise.race([
    fetch(request, init),
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
    const indexRes = await timeoutFetch(indexUrl, REVALIDATE_TIMEOUT);
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
        const res = await timeoutFetch(url, REVALIDATE_TIMEOUT);
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
      const ready = await precacheShell().catch(() => false);
      const cache = await caches.open(CACHE);
      const has = await cache.match(new URL("index.html", self.registration.scope).href);
      if (ready || has) await self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const indexUrl = new URL("index.html", self.registration.scope).href;
      const hasShell = (await cache.match(indexUrl)) || (await cache.match(self.registration.scope));
      if (hasShell) {
        const keys = await caches.keys();
        await Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key)));
      }
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
  const urls = [
    new URL("index.html", base).href,
    base,
    new URL("./", base).href,
  ];
  const names = await caches.keys();
  for (const name of names) {
    const cache = await caches.open(name);
    for (const url of urls) {
      const hit = (await cache.match(url)) || (await cache.match(url, { ignoreSearch: true }));
      if (hit) return htmlResponse(hit);
    }
    const keys = await cache.keys();
    for (const req of keys) {
      if (/index\.html(?:\?|$)/.test(req.url)) {
        const hit = await cache.match(req);
        if (hit) return htmlResponse(hit);
      }
    }
  }
  return null;
}

async function htmlResponse(response) {
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.delete("content-encoding");
  headers.delete("content-length");
  const body = await response.clone().blob();
  return new Response(body, { status: 200, headers });
}

function revOf(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

async function notify(data) {
  const list = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of list) client.postMessage(data);
}

let refreshing = null;

async function doRevalidate() {
  const indexUrl = new URL("index.html", self.registration.scope).href;
  const old = await caches.match(indexUrl);
  const previous = old ? await old.clone().text() : "";
  let html = "";
  try {
    const indexRes = await timeoutFetch(indexUrl, REVALIDATE_TIMEOUT);
    if (indexRes && indexRes.ok) html = await indexRes.text();
  } catch {
    html = "";
  }
  if (!html) {
    await notify({ type: "degraded" });
    return;
  }
  if (previous && html === previous) {
    await notify({ type: "online" });
    return;
  }
  const ready = await precacheShell().catch(() => false);
  if (!ready) {
    await notify({ type: "degraded" });
    return;
  }
  await notify({ type: "online" });
  const nextRes = await caches.match(indexUrl);
  const next = nextRes ? await nextRes.clone().text() : "";
  if (next && next !== previous) await notify({ type: "updated", rev: revOf(next) });
}

function revalidate() {
  if (!refreshing) {
    refreshing = doRevalidate().finally(() => {
      refreshing = null;
    });
  }
  return refreshing;
}

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "revalidate") event.waitUntil(revalidate());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const navigate = event.request.mode === "navigate";
        const offline = self.navigator.onLine === false;

        if (navigate) {
          const fallback = (await cached(event.request).then((hit) => (hit ? htmlResponse(hit) : null))) || (await shell());
          if (fallback) {
            if (!offline) event.waitUntil(revalidate());
            return fallback;
          }
          if (!offline) {
            try {
              const fresh = await timeoutFetch(event.request, REVALIDATE_TIMEOUT);
              if (fresh && fresh.ok) {
                event.waitUntil(revalidate());
                return htmlResponse(fresh);
              }
            } catch {
              /* 首次沒有快取 */
            }
          }
          return new Response(
            "<!doctype html><meta charset=utf-8><title>英傑大戦⚡️速查</title><body style=\"margin:0;background:#0c0b0a;color:#f3efe6;font-family:sans-serif;display:grid;min-height:100vh;place-items:center\"><p>尚未有離線資料。請先連線開啟一次。</p>",
            { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
          );
        }

        const hit = await cached(event.request);
        if (hit) return hit;
        if (offline) return new Response("", { status: 503, statusText: "offline" });

        try {
          const fresh = await timeoutFetch(event.request, NETWORK_TIMEOUT);
          if (fresh && fresh.ok) {
            const copy = await materialize(fresh);
            const cache = await caches.open(CACHE);
            event.waitUntil(cache.put(event.request, copy.clone()).catch(() => undefined));
            return copy;
          }
          return fresh;
        } catch {
          return new Response("", { status: 503, statusText: "offline" });
        }
      } catch {
        const page = await shell().catch(() => null);
        if (page) return page;
        return new Response("", { status: 503, statusText: "offline" });
      }
    })(),
  );
});
