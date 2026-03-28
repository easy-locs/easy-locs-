console.info("[BOOT_EARLIEST] main.tsx module executing", Date.now()); // v2
import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import "./styles/performance.css";
import { APP_VERSION } from "@/lib/version-check";
import { initMonitoring } from "@/lib/monitoring";
import "@/lib/events/event-init"; // Boot event pipeline: platformBus → eventBus → handlers

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root not found");
}

if (typeof window !== "undefined") {
  const { pathname, hash } = window.location;
  const isDirectDeepLink = pathname !== "/" && pathname !== "/index.html";

  if (isDirectDeepLink && !hash) {
    window.location.hash = pathname;
  }

  const buildWindow = window as Window & { __EASYLOCS_BUILD_ID__?: string };
  buildWindow.__EASYLOCS_BUILD_ID__ = APP_VERSION;
  console.info("[Boot] Easy-Locs version", APP_VERSION);

  // ── Boot-time purge: kill stale service workers & caches ──
  (async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
        if (regs.length) console.info("[Boot] Purged", regs.length, "stale service worker(s)");
      }
      if ("caches" in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        if (keys.length) console.info("[Boot] Purged", keys.length, "stale cache(s)");
      }
    } catch { /* best-effort */ }
  })();

  initMonitoring();
}

// Remove the static loading fallback as soon as the app bundle starts executing.
rootElement.innerHTML = "";

console.info("[MAIN_BOOT_START]", performance.now().toFixed(1), "ms");

try {
  console.info("[MAIN_BOOT_RENDER] createRoot + render");
  ReactDOM.createRoot(rootElement).render(
    <HashRouter>
      <App />
    </HashRouter>
  );
  (window as any).__EASYLOCS_BOOTED__ = true;
  console.info("[MAIN_BOOT_DONE]", performance.now().toFixed(1), "ms");
} catch (err) {
  console.error("[MAIN_BOOT_CRASH]", err);
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;">
      <div style="text-align:center;max-width:400px;padding:20px;">
        <p style="font-size:18px;margin:0 0 8px;">Boot Error</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">${err instanceof Error ? err.message : String(err)}</p>
        <button onclick="location.reload()" style="background:#D4A853;color:#0F1117;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">Reload</button>
      </div>
    </div>`;
}
