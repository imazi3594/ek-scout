import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ScoutApp } from "@/components/scout-app";
import { initInstallCapture } from "@/lib/install";
import "./app.css";

initInstallCapture();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ScoutApp />
  </StrictMode>,
);

if ("serviceWorker" in navigator) {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (navigator.onLine) window.location.reload();
    });
  }
  void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL,
  });
}
