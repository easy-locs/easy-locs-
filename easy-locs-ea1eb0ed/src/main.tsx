import "./polyfills";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import RawApp from "./App";
import "./index.css";
import { APP_VERSION } from "@/lib/version-check";
import { initSentryBoot, captureBootCrash, reportTimeToFirstRender } from "@/lib/analytics/sentry";
import { startTrace, installFetchTracePropagation } from "@/lib/observability/trace-context";
import { initBrowserOtel } from "@/lib/observability/otel-bootstrap";
import { validateIntegrationsBoot } from "@/lib/integrations";

// Boot-crash tracking MUST be the first thing so we catch errors thrown
// during module evaluation, React mount, or the very first render. Full
// Sentry (replays, tracing) is upgraded later in Stage 1 of the boot plan.
const __BOOT_START__ = performance.now();
// Each of these must NEVER throw out of module evaluation — they are wrapped
// individually so a single failing helper cannot blank the screen. The render
// try/catch below is the second safety net; the React error boundary inside
// CoreProviders is the third. See docs/boot-audit.md for the full chain.
try { initSentryBoot(); } catch (err) { console.warn("[boot] initSentryBoot failed", err); }
try { startTrace(); } catch (err) { console.warn("[boot] startTrace failed", err); }
try { installFetchTracePropagation(); } catch (err) { console.warn("[boot] installFetchTracePropagation failed", err); }
// Best-effort OTel bootstrap — no-op unless VITE_OTEL_EXPORTER_OTLP_ENDPOINT is set.
try { void initBrowserOtel({ serviceName: "easy-locs-frontend" }); } catch (err) { console.warn("[boot] initBrowserOtel failed", err); }

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
  const { hash } = window.location;
  if (hash && hash.startsWith("#/")) {
    const cleanPath = hash.slice(1);
    window.history.replaceState(null, "", cleanPath);
  }
  (window as any).__EASYLOCS_BUILD_ID__ = APP_VERSION;
  // Surface the build ID in the DOM so support can read it without opening
  // devtools (e.g. "view page source" or inspect <html>).
  try {
    document.documentElement.setAttribute("data-build-id", APP_VERSION);
    const meta = document.createElement("meta");
    meta.name = "x-app-build-id";
    meta.content = APP_VERSION;
    document.head.appendChild(meta);
  } catch {}
}

// Time-to-first-render watchdog: if the splash hasn't dismissed (i.e. the
// first React commit hasn't happened) within the budget, fire a Sentry
// warning so we detect silent boot stalls in production.
const TTFR_BUDGET_MS = 8000;
let __ttfrReported = false;
function __reportTTFR(durationMs: number) {
  if (__ttfrReported) return;
  __ttfrReported = true;
  reportTimeToFirstRender(durationMs, TTFR_BUDGET_MS);
}
if (typeof window !== "undefined") {
  window.addEventListener(
    "react-splash-ready",
    () => __reportTTFR(performance.now() - __BOOT_START__),
    { once: true },
  );
  setTimeout(() => {
    if (!__ttfrReported) {
      __reportTTFR(performance.now() - __BOOT_START__);
    }
  }, TTFR_BUDGET_MS + 50);
}

try {
  // Loud, single-shot validation of every required integration env var. In dev
  // this throws when truly critical integrations (Supabase) are missing so the
  // developer sees the failure immediately. Non-critical integrations (AWS,
  // PostHog, Sentry) only emit a warning + dev banner — they no longer block
  // boot. Wrapped here so any throw lands in the visible Boot Error UI below
  // instead of aborting module evaluation and producing a blank screen.
  validateIntegrationsBoot();
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
  const splashEl = rootElement.querySelector("#app-loading") as HTMLElement | null;
  if (splashEl) {
    let faded = false;
    const fadeOutHtmlSplash = () => {
      if (faded) return;
      faded = true;
      splashEl.classList.add("fade-out");
      setTimeout(() => splashEl.remove(), 600);
    };
    window.addEventListener("react-splash-ready", fadeOutHtmlSplash, { once: true });
    setTimeout(fadeOutHtmlSplash, 3000);
    setTimeout(() => {
      if (faded || !document.body.contains(splashEl)) return;
      const skipBtn = document.createElement("button");
      skipBtn.textContent = "Continue anyway";
      skipBtn.setAttribute("aria-label", "Skip loading screen");
      skipBtn.style.cssText = "margin-top:24px;background:transparent;color:#94a3b8;border:1px solid #334155;padding:8px 20px;border-radius:8px;font-size:13px;font-weight:600;cursor:pointer;font-family:inherit;";
      skipBtn.onclick = fadeOutHtmlSplash;
      splashEl.appendChild(skipBtn);
    }, 5000);
  }
  // NOTE: __EASYLOCS_REACT_MOUNTED__ / __EASYLOCS_BOOTED__ are intentionally
  // NOT set here. They are set inside a React useEffect (SplashScreen) so the
  // flags reflect an actual React commit. Setting them synchronously here
  // poisons the HTML-side boot watchdog (`checkBoot` + 6s rescue in index.html)
  // and leaves users stuck on the splash if React never commits (task #718).
} catch (err) {
  console.error("[BOOT_CRASH]", err);
  captureBootCrash(err, {
    phase: "render",
    timeSinceBootMs: Math.round(performance.now() - __BOOT_START__),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
  });
  rootElement.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;font-family:'Plus Jakarta Sans',system-ui,sans-serif;background:hsl(225 28% 7%);">
      <div style="text-align:center;max-width:400px;padding:20px;">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style="margin:0 auto 16px;display:block;"><circle cx="24" cy="24" r="8.4" stroke="hsl(168 72% 44%)" stroke-width="0.8" stroke-opacity="0.35" fill="none"/><circle cx="24" cy="24" r="14.4" stroke="hsl(168 72% 44%)" stroke-width="0.8" stroke-opacity="0.27" fill="none"/><circle cx="24" cy="24" r="20.4" stroke="hsl(168 72% 44%)" stroke-width="0.8" stroke-opacity="0.19" fill="none"/><circle cx="24" cy="24" r="2.4" fill="hsl(168 72% 44%)"/></svg>
        <p style="font-size:18px;color:#f8fafc;margin:0 0 8px;">Boot Error</p>
        <p style="font-size:13px;color:#94a3b8;margin:0 0 16px;" id="boot-error-msg"></p>
        <button onclick="try{caches.keys().then(function(n){return Promise.all(n.map(function(k){return caches.delete(k)}))}).finally(function(){location.reload()})}catch(e){location.reload()}" style="background:linear-gradient(135deg,hsl(168 72% 44%),hsl(168 78% 32%));color:hsl(225 28% 7%);border:none;padding:10px 24px;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;box-shadow:0 0 20px hsl(168 72% 44%/0.25);">Reload</button>
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
    import("@/lib/maplibre/config").then(m => m.validateMapBoot()),
  ]).catch(() => {});
}, { timeout: 5000 });
