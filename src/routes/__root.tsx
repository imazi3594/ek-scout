import { createRootRoute, HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth/provider";
import { PreviewHostBridge } from "@/components/preview-host-bridge";
import appCss from "../styles.css?url";

const APP_NAME = "英傑大戦⚡️速查";
const APP_SHORT = "英傑⚡️速查";
const NOTO =
  "https://fonts.googleapis.com/css2?family=Noto+Sans+HK:wght@400;500;600;700&family=Noto+Sans+JP:wght@400;500;600;700&display=swap";

function LockAppName() {
  useEffect(() => {
    const apply = () => {
      if (document.title !== APP_NAME) document.title = APP_NAME;
      const meta = document.querySelector('meta[name="apple-mobile-web-app-title"]');
      if (meta && meta.getAttribute("content") !== APP_NAME) meta.setAttribute("content", APP_NAME);
      document.querySelectorAll('link[rel="apple-touch-icon"]').forEach((node) => {
        const href = node.getAttribute("href") ?? "";
        if (href.includes("/__grok/")) node.remove();
        else if (!href.endsWith("apple-touch-icon.png")) node.setAttribute("href", "/apple-touch-icon.png");
      });
      if (!document.querySelector('link[rel="apple-touch-icon"]')) {
        const link = document.createElement("link");
        link.rel = "apple-touch-icon";
        link.href = "/apple-touch-icon.png";
        document.head.appendChild(link);
      }
      document.querySelectorAll('link[rel="icon"]').forEach((node) => {
        const href = node.getAttribute("href") ?? "";
        if (href.includes("/__grok/") || !href.includes("favicon")) {
          node.setAttribute("href", "/favicon.svg");
          node.setAttribute("type", "image/svg+xml");
        }
      });
    };
    apply();
    const obs = new MutationObserver(apply);
    obs.observe(document.head, {
      subtree: true,
      childList: true,
      attributes: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, []);
  return null;
}

function OnlineFonts() {
  useEffect(() => {
    const load = () => {
      if (!navigator.onLine || document.querySelector("link[data-noto]")) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = NOTO;
      link.setAttribute("data-noto", "");
      document.head.appendChild(link);
    };
    if (navigator.onLine) load();
    else window.addEventListener("online", load, { once: true });
    return () => window.removeEventListener("online", load);
  }, []);
  return null;
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: APP_NAME },
      { name: "theme-color", content: "#0c0b0a" },
      { name: "apple-mobile-web-app-title", content: APP_NAME },
      { name: "apple-mobile-web-app-capable", content: "yes" },
      { name: "mobile-web-app-capable", content: "yes" },
      { name: "apple-mobile-web-app-status-bar-style", content: "black-translucent" },
      {
        name: "description",
        content: "輸入英傑大戦武將名稱、卡號或計略，即時查看計略時長（C）與效果值。繁中對照。",
      },
    ],
    links: [
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/apple-touch-icon.png" },
      { rel: "manifest", href: "/__grok/manifest.webmanifest" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  component: () => (
    <html lang="zh-Hant" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="antialiased">
        <PreviewHostBridge />
        <LockAppName />
        <OnlineFonts />
        <div className="flex min-h-0 flex-1 flex-col">
          <AuthProvider>
            <Outlet />
          </AuthProvider>
        </div>
        <Scripts />
      </body>
    </html>
  ),
});
