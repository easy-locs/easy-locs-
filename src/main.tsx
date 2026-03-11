import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CHUNK_RELOAD_KEY = "easylocs_chunk_reload_once";

const safeReloadOnce = () => {
  try {
    const alreadyReloaded = sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1";
    if (!alreadyReloaded) {
      sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
      window.location.reload();
      return;
    }
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  } catch {
    window.location.reload();
  }
};

if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    safeReloadOnce();
  });

  window.addEventListener("unhandledrejection", (event) => {
    const message = String((event.reason as Error)?.message || event.reason || "").toLowerCase();
    if (message.includes("failed to fetch dynamically imported module") || message.includes("importing a module script failed")) {
      event.preventDefault();
      safeReloadOnce();
    }
  });

  window.addEventListener("load", () => {
    try {
      sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    } catch {
      // noop
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);

// Defer non-critical init to after first paint
requestIdleCallback?.(() => {
  import("./lib/analytics").then(({ initAnalytics }) => initAnalytics());
  import("./lib/monitoring").then(({ initMonitoring }) => initMonitoring());
}) ?? setTimeout(() => {
  import("./lib/analytics").then(({ initAnalytics }) => initAnalytics());
  import("./lib/monitoring").then(({ initMonitoring }) => initMonitoring());
}, 2000);

