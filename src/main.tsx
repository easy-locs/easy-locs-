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
  console.info("[Build] Easy-Locs version", APP_VERSION);

  initMonitoring();
}

// Remove the static loading fallback as soon as the app bundle starts executing.
rootElement.innerHTML = "";

try {
  ReactDOM.createRoot(rootElement).render(
    <HashRouter>
      <App />
    </HashRouter>
  );
} catch (err) {
  console.error("[Boot] React render crashed", err);
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;">
      <div style="text-align:center;max-width:400px;padding:20px;">
        <p style="font-size:18px;margin:0 0 8px;">Boot Error</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;">${err instanceof Error ? err.message : String(err)}</p>
        <button onclick="location.reload()" style="background:#D4A853;color:#0F1117;border:none;padding:10px 24px;border-radius:8px;font-size:14px;cursor:pointer;">Reload</button>
      </div>
    </div>`;
}
