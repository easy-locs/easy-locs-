import "./polyfills";
import ReactDOM from "react-dom/client";
import { HashRouter } from "react-router-dom";
import RawApp from "./App";
import "./index.css";
import { APP_VERSION } from "@/lib/version-check";

const App = RawApp;

if (typeof globalThis.crypto !== "undefined" && typeof globalThis.crypto.randomUUID !== "function") {
  (globalThis.crypto as any).randomUUID = () =>
    "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: string) =>
      (+c ^ (globalThis.crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (+c / 4)))).toString(16)
    );
}

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element #root not found");

if (typeof window !== "undefined") {
  const { pathname, hash } = window.location;
  if (pathname !== "/" && pathname !== "/index.html" && !hash) {
    window.location.hash = pathname;
  }
  (window as any).__EASYLOCS_BUILD_ID__ = APP_VERSION;
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <HashRouter>
      <App />
    </HashRouter>
  );
  rootElement.querySelector("#app-loading")?.remove();
  (window as any).__EASYLOCS_REACT_MOUNTED__ = true;
  (window as any).__EASYLOCS_BOOTED__ = true;
} catch (err) {
  console.error("[BOOT_CRASH]", err);
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:system-ui;background:#0D1117;">
      <div style="text-align:center;max-width:400px;padding:20px;">
        <p style="font-size:18px;color:#f8fafc;margin:0 0 8px;">Boot Error</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;" id="boot-error-msg"></p>
        <button onclick="try{caches.keys().then(function(n){return Promise.all(n.map(function(k){return caches.delete(k)}))}).finally(function(){location.reload()})}catch(e){location.reload()}" style="background:#1AAE8E;color:#0D1117;border:none;padding:10px 24px;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;">Reload</button>
      </div>
    </div>`;
  const msgEl = document.getElementById("boot-error-msg");
  if (msgEl) msgEl.textContent = err instanceof Error ? err.message : String(err);
}

requestIdleCallback(() => {
  import("@/lib/analytics/sentry").then(m => m.initSentry()).catch(() => {});
  import("@/lib/auto-heal").then(m => m.installGlobalHealer()).catch(() => {});
}, { timeout: 2000 });

requestIdleCallback(() => {
  import("@/lib/platform/web-vitals").then(m => m.initWebVitals()).catch(() => {});
  import("@/lib/performance/web-vitals-reporter").then(m => m.initWebVitalsReporter()).catch(() => {});
}, { timeout: 4000 });

requestIdleCallback(() => {
  import("@/lib/performance/register-route-chunks").then(m => m.registerAllRouteChunks()).catch(() => {});
  import("@/lib/performance/route-prefetch").then(m => m.initRoutePrefetch()).catch(() => {});
}, { timeout: 5000 });

requestIdleCallback(() => {
  import("@/lib/monitoring").then(m => m.initMonitoring()).catch(() => {});
  import("@/lib/events/event-init").catch(() => {});
  import("@/lib/e2ee/e2ee-session-manager").then(m => m.warmupE2EE()).catch(() => {});
}, { timeout: 8000 });
