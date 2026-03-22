import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import { APP_VERSION } from "@/lib/version-check";

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

  if ("serviceWorker" in navigator) {
    void navigator.serviceWorker.getRegistrations().then(async (registrations) => {
      if (!registrations.length) {
        console.info("[Build] service worker active", false);
        return;
      }

      await Promise.all(registrations.map((registration) => registration.unregister()));
      console.warn("[Build] unregistered legacy service workers", registrations.length);
    });
  }
}

// Remove the static loading fallback as soon as the app bundle starts executing.
// This prevents the 12s crash-recovery timer in index.html from showing a false
// network/cache error while React is still bootstrapping on slower preview loads.
rootElement.innerHTML = "";

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </React.StrictMode>
);
