/**
 * Runs before `grok-pwa.ts` (Nitro sorts middleware by filename). Returning a
 * response here stops the platform handler from answering this URL with
 * "Grok App" after the next Export from Grok resets that file.
 */
import { isAppPlatformManifestPath, renderAppPlatformManifest } from "../app-pwa-identity.mjs";

/**
 * @param {{ url?: { pathname?: string }, req?: { method?: string } }} event
 * @param {() => unknown} next
 */
export default async function appPwaIdentityMiddleware(event, next) {
  const method = String(event?.req?.method ?? "GET").toUpperCase();
  if (method !== "GET" || !isAppPlatformManifestPath(event?.url?.pathname)) return next();
  return new Response(renderAppPlatformManifest(), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "no-cache",
    },
  });
}
