/**
 * Identity for the URL grok.me injects (`/__grok/manifest.webmanifest`).
 *
 * Export from Grok replaces `scripts/grok-pwa-shared.mjs` and
 * `server/middleware/grok-pwa.ts` with the platform template, which names the
 * installed PWA "Grok App" whenever the request host is not `*.grok.me`
 * (published apps see a `*.vercel.app` host). This module is app code, so
 * that reset does not rename the home-screen icon.
 *
 * `id` stays "/" because that is the id the Android install already has.
 * Relative icon URLs would resolve under `/__grok/`, so these are absolute.
 */
export const APP_PWA_NAME = "英傑大戦⚡️速查";
export const APP_PWA_SHORT_NAME = "英傑⚡️速查";
export const APP_PWA_THEME = "#0c0b0a";

export const APP_PWA_ICONS = [
  { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
  { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
  { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png", purpose: "any" },
  { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
];

/** @param {string | null | undefined} pathname */
export function isAppPlatformManifestPath(pathname) {
  const path = String(pathname ?? "").split("?", 1)[0];
  return path === "/__grok/manifest.webmanifest" || path === "/__grok/manifest.json";
}

export function renderAppPlatformManifest() {
  return JSON.stringify(
    {
      name: APP_PWA_NAME,
      short_name: APP_PWA_SHORT_NAME,
      id: "/",
      start_url: "/",
      scope: "/",
      display: "standalone",
      background_color: APP_PWA_THEME,
      theme_color: APP_PWA_THEME,
      icons: APP_PWA_ICONS,
    },
    null,
    2,
  );
}
