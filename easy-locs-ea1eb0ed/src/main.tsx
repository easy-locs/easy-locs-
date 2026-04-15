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
  const splashEl = rootElement.querySelector("#app-loading") as HTMLElement | null;
  if (splashEl) {
    splashEl.classList.add("fade-out");
    setTimeout(() => splashEl.remove(), 600);
  }
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

/**
 * 3-Stage Progressive Boot
 * Stage 1 (0ms): Critical path — error tracking + self-healing
 * Stage 2 (300ms): Navigation — route chunks + prefetch + module preloads
 * Stage 3 (idle): Enrichment — monitoring, country, compliance, SEO, tokens, security
 */

// Stage 1: Critical path (immediate after render, < 2s budget)
requestIdleCallback(() => {
  Promise.all([
    import("@/lib/analytics/sentry").then(m => m.initSentry()),
    import("@/lib/auto-heal").then(m => m.installGlobalHealer()),
  ]).catch(() => {});
}, { timeout: 2000 });

// Stage 2: Navigation readiness (300ms after mount, < 1s budget)
function injectModulePreloads() {
  if (import.meta.env.DEV) return;
  const pillarPatterns = ["pillar-dashboard", "pillar-radar", "pillar-orbit", "pillar-wallet", "pillar-me"];
  const existing = new Set(
    Array.from(document.querySelectorAll('link[rel="modulepreload"]')).map(l => (l as HTMLLinkElement).href)
  );
  for (const pattern of pillarPatterns) {
    const links = document.querySelectorAll(`link[href*="${pattern}"]`);
    if (links.length > 0) continue;
    const perf = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const entry = perf.find(e => e.name.includes(pattern));
    if (entry && !existing.has(entry.name)) {
      const link = document.createElement("link");
      link.rel = "modulepreload";
      link.href = entry.name;
      document.head.appendChild(link);
    }
  }
}

setTimeout(() => {
  injectModulePreloads();
  Promise.all([
    import("@/lib/performance/register-route-chunks")
      .then(m => { m.registerAllRouteChunks(); return import("@/lib/performance/route-prefetch"); })
      .then(m => m.initRoutePrefetch()),
    import("@/lib/platform/web-vitals").then(m => m.initWebVitals()),
    import("@/lib/performance/web-vitals-reporter").then(m => m.initWebVitalsReporter()),
  ]).catch(() => {});
}, 300);

// Stage 3: Enrichment (idle, < 3s budget)
requestIdleCallback(() => {
  Promise.all([
    import("@/lib/country/global-country-config").then(m => {
      const country = m.detectUserCountry();
      const config = m.getCountryConfig(country);
      (window as Record<string, unknown>).__EASYLOCS_COUNTRY__ = country;
      (window as Record<string, unknown>).__EASYLOCS_COUNTRY_CONFIG__ = config;
    }),
    import("@/lib/compliance/regional-compliance"),
    import("@/lib/design-tokens").then(m => {
      const style = document.createElement("style");
      style.id = "design-tokens";
      style.textContent = m.generateCSSCustomProperties();
      document.head.appendChild(style);
    }),
    import("@/lib/seo/structured-data").then(m => {
      const ld = m.buildWebAppLD();
      const script = document.createElement("script");
      script.type = "application/ld+json";
      script.textContent = JSON.stringify(ld);
      document.head.appendChild(script);
    }),
  ]).catch(() => {});
}, { timeout: 3000 });

requestIdleCallback(() => {
  Promise.all([
    import("@/lib/monitoring").then(m => m.initMonitoring()),
    import("@/lib/events/event-init"),
    import("@/lib/e2ee/e2ee-session-manager").then(m => m.warmupE2EE()),
  ]).catch(() => {});
}, { timeout: 8000 });
