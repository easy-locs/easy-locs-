import React from "react";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import App from "./App";
import "./index.css";
import {
  APP_VERSION,
  enforceVersionConsistencyOnBoot,
  purgeLegacyServiceWorkersAndCaches,
} from "@/lib/version-check";

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

  void purgeLegacyServiceWorkersAndCaches()
    .then((hadLegacyRegistrations) => {
      console.info("[Build] service worker active", hadLegacyRegistrations);
      if (hadLegacyRegistrations) {
        console.warn("[Build] unregistered legacy service workers", hadLegacyRegistrations);
      }
    })
    .catch((error) => {
      console.warn("[Build] failed to purge legacy caches", error);
    });

  // DISABLED — was causing infinite reload loop in preview/deploy environments
  // void enforceVersionConsistencyOnBoot().then((reloadedForFreshBuild) => {
  //   console.info("[Build] stale HTML detected", reloadedForFreshBuild);
  // });
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
