const CACHE = "ek-scout-v11";
const NETWORK_TIMEOUT = 8000;
const REVALIDATE_TIMEOUT = 8000;
const UPDATE_AFTER_MS = 30_000;

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
  const scopeUrl = new URL("./", base).href;
  let html = "";
  try {
    const indexRes = await timeoutFetch(indexUrl, REVALIDATE_TIMEOUT);
    if (indexRes.ok) html = await indexRes.text();
  } catch {
    html = "";
  }
  if (!html) {
    try {
      const scopeRes = await timeoutFetch(scopeUrl, REVALIDATE_TIMEOUT);
      if (scopeRes.ok) html = await scopeRes.text();
    } catch {
      return false;
    }
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
      if (await detectDev()) {
        await self.skipWaiting();
        return;
      }
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
      if (devMode || (await detectDev())) {
        await self.registration.unregister();
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
        const list = await self.clients.matchAll({ type: "window" });
        for (const client of list) {
          try {
            await client.navigate(client.url);
          } catch {
            /* already navigating */
          }
        }
        return;
      }
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

function shellKey(html) {
  const urls = [];
  const re = /(?:src|href)="([^"]+)"/g;
  let match;
  while ((match = re.exec(html))) {
    const href = match[1];
    if (/\.(?:js|css)(?:\?|#|$)/.test(href) || href.includes("/assets/")) urls.push(href.split("?")[0]);
  }
  urls.sort();
  return urls.join("|");
}

function looksLikeDev(html) {
  return html.includes("tanstack-start-dev") || html.includes("@react-refresh") || html.includes("/@vite/");
}

let devMode = false;

async function detectDev() {
  try {
    const res = await fetch(new URL("./", self.registration.scope), { cache: "reload" });
    const html = await res.text();
    devMode = looksLikeDev(html);
  } catch {
    devMode = false;
  }
  return devMode;
}

async function notify(data) {
  const list = await self.clients.matchAll({ includeUncontrolled: true, type: "window" });
  for (const client of list) client.postMessage(data);
}

let refreshing = null;
let openedAt = 0;
let updateTimer = null;
let forceUpdate = false;

function scheduleUpdate() {
  openedAt = Date.now();
  if (updateTimer) clearTimeout(updateTimer);
  updateTimer = setTimeout(() => {
    updateTimer = null;
    if (self.navigator.onLine === false) return;
    void revalidate();
  }, UPDATE_AFTER_MS);
}

async function doRevalidate() {
  const force = forceUpdate;
  if (force) forceUpdate = false;
  if (!force && self.navigator.onLine === false) return;
  if (!force && (!openedAt || Date.now() - openedAt < UPDATE_AFTER_MS - 1000)) return;
  const base = self.registration.scope;
  const indexUrl = new URL("index.html", base).href;
  const scopeUrl = new URL("./", base).href;
  const old = (await caches.match(indexUrl)) || (await caches.match(scopeUrl)) || (await caches.match(base));
  const previous = old ? await old.clone().text() : "";
  let html = "";
  for (const url of [scopeUrl, indexUrl]) {
    try {
      const indexRes = await timeoutFetch(url, REVALIDATE_TIMEOUT);
      if (indexRes && indexRes.ok) {
        html = await indexRes.text();
        if (html) break;
      }
    } catch {
      html = "";
    }
  }
  if (!html) {
    await notify(force ? { type: "update-result", ok: false } : { type: "degraded" });
    return;
  }
  if (previous && (html === previous || (shellKey(html) && shellKey(html) === shellKey(previous)))) {
    await notify(force ? { type: "update-result", ok: true } : { type: "online" });
    return;
  }
  const ready = await precacheShell().catch(() => false);
  if (!ready) {
    await notify(force ? { type: "update-result", ok: false } : { type: "degraded" });
    return;
  }
  await notify({ type: "online" });
  const nextRes = await caches.match(indexUrl);
  const next = nextRes ? await nextRes.clone().text() : "";
  if (next && shellKey(next) && shellKey(next) !== shellKey(previous)) {
    await notify({ type: "updated", rev: revOf(shellKey(next)), reload: force });
  } else if (force) {
    await notify({ type: "update-result", ok: true });
  }
}

function revalidate() {
  const run = () => {
    const job = doRevalidate().finally(() => {
      if (refreshing === job) refreshing = null;
    });
    refreshing = job;
    return job;
  };
  if (!refreshing) return run();
  if (!forceUpdate) return refreshing;
  const pending = refreshing;
  return pending.then(() => run());
}

const OFFLINE_HTML =
  "<!doctype html><meta charset=utf-8><title>英傑大戦⚡️速查</title><body style=\"margin:0;background:#0c0b0a;color:#f3efe6;font-family:sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center;padding:24px\"><p>尚未有離線資料。請先連線開啟一次。</p>";

function offlineDocument() {
  return new Response(OFFLINE_HTML, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

self.addEventListener("message", (event) => {
  const data = event.data;
  if (!data) return;
  if (data.type === "skip-wait") {
    void self.skipWaiting();
    return;
  }
  if (data.type !== "revalidate") return;
  const since = Number(data.since || 0);
  if (data.force) {
    forceUpdate = true;
    openedAt = Date.now() - UPDATE_AFTER_MS;
  } else if (since >= UPDATE_AFTER_MS - 1000) {
    openedAt = Date.now() - since;
  }
  event.waitUntil(revalidate());
});

self.addEventListener("fetch", (event) => {
  if (devMode) return;
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (
    url.pathname.startsWith("/@") ||
    url.pathname.startsWith("/src/") ||
    url.pathname.startsWith("/node_modules/")
  ) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        const navigate = event.request.mode === "navigate";
        const offline = self.navigator.onLine === false;

        if (navigate) {
          const fallback = (await cached(event.request).then((hit) => (hit ? htmlResponse(hit) : null))) || (await shell());
          if (fallback) {
            scheduleUpdate();
            return fallback;
          }
          if (!offline) {
            try {
              const fresh = await timeoutFetch(event.request, REVALIDATE_TIMEOUT);
              if (fresh && fresh.ok) {
                scheduleUpdate();
                return htmlResponse(fresh);
              }
            } catch {
              /* 首次沒有快取 */
            }
          }
          return offlineDocument();
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
        if (event.request.mode === "navigate") {
          const page = await shell().catch(() => null);
          if (page) return page;
          return offlineDocument();
        }
        return new Response("", { status: 503, statusText: "offline" });
      }
    })(),
  );
});
