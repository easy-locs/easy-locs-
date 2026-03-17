import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Build anchor — forces fresh chunk hash on deploy
const BUILD_REV = "2026-03-17T23:05:00Z";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

const root = (rootElement as any).__reactRoot ?? createRoot(rootElement);
(rootElement as any).__reactRoot = root;

root.render(<App />);

console.info(`[boot] Easy-Locs started (rev ${BUILD_REV})`);

// ── Deferred non-critical init ──────────────────────────────────────────────

const runDeferredInit = () => {
  void import("./lib/security-utils")
    .then((mod) => mod?.injectCSPMeta?.())
    .catch((e) => console.debug("[boot] CSP skipped:", e));

  void import("./lib/shared/platform-bus")
    .then((mod) => mod?.installPlatformReactions?.())
    .catch((e) => console.debug("[boot] platform-bus skipped:", e));

  void import("./lib/shared/storefront-reactions")
    .then((mod) => mod?.installStorefrontReactions?.())
    .catch((e) => console.debug("[boot] storefront-reactions skipped:", e));

  void import("./lib/shared/v4-delivery-bridge")
    .then((mod) => mod?.installDeliveryBridge?.())
    .catch((e) => console.debug("[boot] v4-delivery-bridge skipped:", e));

  void import("./lib/analytics")
    .then((mod) => mod?.initAnalytics?.())
    .catch((e) => console.debug("[boot] analytics skipped:", e));

  void import("./lib/monitoring")
    .then((mod) => mod?.initMonitoring?.())
    .catch((e) => console.debug("[boot] monitoring skipped:", e));

  void import("./lib/web-vitals")
    .then((mod) => mod?.initWebVitals?.())
    .catch((e) => console.debug("[boot] web-vitals skipped:", e));

  // Prefetch critical routes after boot settles
  void import("./lib/performance").then(({ prefetchRoutes }) => {
    prefetchRoutes([
      () => import("./pages/Dashboard"),
      () => import("./pages/Login"),
      () => import("./pages/CommunicationCenter"),
    ]);
  }).catch(() => {});
};

if (typeof window !== "undefined") {
  // Handle chunk load failures gracefully
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    window.location.reload();
  });

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(runDeferredInit);
  } else {
    setTimeout(runDeferredInit, 2000);
  }
}
