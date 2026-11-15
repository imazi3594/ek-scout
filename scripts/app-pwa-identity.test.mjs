import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import middleware from "../server/middleware/0.app-pwa-identity.mjs";
import { renderAppPlatformManifest } from "../server/app-pwa-identity.mjs";
import { renderWebManifest } from "./grok-pwa-shared.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function readJson(rel) {
  return JSON.parse(readFileSync(join(ROOT, rel), "utf8"));
}

test("platform manifest keeps the installed id and this app's name", () => {
  const manifest = JSON.parse(renderAppPlatformManifest());
  const site = readJson("src/lib/og/site.json");
  const own = readJson("public/manifest.webmanifest");
  assert.equal(manifest.name, "英傑大戦⚡️速查");
  assert.equal(manifest.short_name, "英傑⚡️速查");
  assert.equal(manifest.name, site.title);
  assert.equal(manifest.short_name, site.short_name);
  assert.equal(manifest.name, own.name);
  assert.equal(manifest.short_name, own.short_name);
  assert.equal(manifest.theme_color, own.theme_color);
  assert.equal(manifest.background_color, own.background_color);
  assert.equal(manifest.id, "/");
  assert.equal(manifest.start_url, "/");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
  assert.equal(manifest.icons[0].src, "/icons/icon-192.png");
  assert.equal(
    manifest.icons.some((icon) => String(icon.src).includes("/__grok/")),
    false,
  );
  for (const icon of own.icons) {
    const src = new URL(icon.src, "https://ek-scout.grok.me/manifest.webmanifest").pathname;
    assert.ok(
      manifest.icons.some((item) => item.src === src && item.purpose === icon.purpose),
      src,
    );
  }
});

test("a rewritten vercel host cannot rename a branded manifest to Grok App", () => {
  const site = readJson("src/lib/og/site.json");
  const fromTemplate = JSON.parse(
    renderWebManifest("01a020b6.vercel.app", site),
  );
  assert.deepEqual(fromTemplate, JSON.parse(renderAppPlatformManifest()));
  assert.notEqual(fromTemplate.name, "Grok App");
});

test("identity middleware answers the platform manifest and lets other requests through", async () => {
  const res = await middleware(
    {
      url: new URL("https://ek-scout.grok.me/__grok/manifest.webmanifest"),
      req: { method: "GET" },
    },
    () => {
      throw new Error("platform handler should not run");
    },
  );
  assert.equal(res.headers.get("content-type"), "application/manifest+json; charset=utf-8");
  assert.equal(res.headers.get("cache-control"), "no-cache");
  const body = JSON.parse(await res.text());
  assert.equal(body.name, "英傑大戦⚡️速查");
  assert.equal(body.short_name, "英傑⚡️速查");
  assert.equal(body.icons[0].src, "/icons/icon-192.png");

  let nextCalled = false;
  const passed = await middleware(
    { url: new URL("https://ek-scout.grok.me/"), req: { method: "GET" } },
    () => {
      nextCalled = true;
      return "app";
    },
  );
  assert.equal(nextCalled, true);
  assert.equal(passed, "app");

  const names = ["0.app-pwa-identity.mjs", "grok-pwa.ts"].sort((a, b) => a.localeCompare(b));
  assert.deepEqual(names, ["0.app-pwa-identity.mjs", "grok-pwa.ts"]);
});

test("vite registers the identity manifest ahead of the platform plugin", () => {
  const vite = readFileSync(join(ROOT, "vite.config.ts"), "utf8");
  const appAt = vite.indexOf("appPwaIdentityPlugin()");
  const grokAt = vite.indexOf("grokPwaPlugin()");
  assert.ok(appAt !== -1 && grokAt !== -1 && appAt < grokAt);
});

test("service workers answer the platform manifest with this app", () => {
  const expected = JSON.parse(renderAppPlatformManifest());
  const copies = ["public/sw.js", "docs/sw.js", "spa/public/sw.js"].map((rel) =>
    readFileSync(join(ROOT, rel), "utf8"),
  );
  assert.equal(copies[0], copies[1]);
  assert.equal(copies[0], copies[2]);
  const sw = copies[0];
  assert.match(sw, /\/__grok\/manifest\.webmanifest/);
  assert.doesNotMatch(sw, /ek-scout-v12/);
  const start = sw.indexOf("const manifest = ");
  const end = sw.indexOf(";\n  return new Response(JSON.stringify(manifest)", start);
  assert.ok(start !== -1 && end !== -1);
  const literal = sw.slice(start + "const manifest = ".length, end);
  const parsed = Function(`"use strict"; return (${literal});`)();
  assert.deepEqual(parsed, expected);
});
