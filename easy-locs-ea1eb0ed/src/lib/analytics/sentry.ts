import * as Sentry from "@sentry/react";
import { isCategoryAllowed } from "@/lib/consent/cookie-consent";
import { APP_VERSION } from "@/lib/version-check";

let _initialized = false;
let _bootInitialized = false;

const NOISE_PATTERNS = [
  "[SentryVerify]",
  "ResizeObserver",
  "ChunkLoadError",
  "Importing a module script failed",
  "Failed to fetch dynamically imported module",
  "Unable to preload CSS",
  "Load failed",
  "NetworkError",
  "AbortError",
  "The operation was aborted",
  "Non-Error promise rejection captured",
  "Object captured as promise rejection",
  "HTTP Client Error with status code: 502",
  "HTTP Client Error with status code: 503",
  "HTTP Client Error with status code: 504",
];

const SENSITIVE_FIELD_PATTERNS = /phone|email|otp|token|password|secret|authorization|api_key|card_number|cvv|pin|ssn|balance/i;

function scrubEventData(data: Record<string, any> | undefined): Record<string, any> | undefined {
  if (!data) return data;
  const scrubbed: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    if (SENSITIVE_FIELD_PATTERNS.test(key)) {
      scrubbed[key] = "[REDACTED]";
    } else if (typeof value === "string" && value.length > 4) {
      scrubbed[key] = value
        .replace(/(\+?\d[\d\s\-().]{7,}\d)/g, "[PHONE]")
        .replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]")
        .replace(/(?:ey[A-Za-z0-9_-]{10,}\.){1,2}[A-Za-z0-9_-]+/g, "[TOKEN]");
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

const HIGH_VALUE_DOMAINS = new Set(["identity", "wallet", "orbit", "canonical", "payments"]);

function tracesSampler(samplingContext: { name?: string; attributes?: Record<string, any>; parentSampled?: boolean }): number {
  if (samplingContext.parentSampled !== undefined) return samplingContext.parentSampled ? 1.0 : 0;

  const name = samplingContext.name || "";
  const domain = samplingContext.attributes?.domain as string | undefined;

  if (domain && HIGH_VALUE_DOMAINS.has(domain)) return 0.8;
  if (name.includes("identity.") || name.includes("wallet.") || name.includes("orbit.")) return 0.8;
  if (name.includes("taxonomy.") || name.includes("canonical.") || name.includes("pipeline.")) return 0.6;
  if (name.includes("pageload") || name.includes("navigation")) return 0.4;

  return 0.2;
}

/**
 * Synchronous Sentry init that MUST run as the first thing at app boot —
 * before React mounts — so we capture crashes that happen during module
 * evaluation or initial render. Crash + tracing telemetry is treated as
 * operational (no PII) and runs regardless of analytics consent. The
 * privacy-sensitive Session Replay integration is NOT installed here;
 * `initSentry()` adds it later if analytics consent has been granted.
 */
export function initSentryBoot() {
  if (_bootInitialized || _initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  _bootInitialized = true;

  try {
    Sentry.init({
      dsn,
      environment: import.meta.env.MODE || "development",
      release: APP_VERSION,
      tracesSampler,
      // Replay is gated on analytics consent and attached lazily in
      // `initSentry()` via `Sentry.addIntegration(...)` — leave it off here.
      replaysSessionSampleRate: 0,
      replaysOnErrorSampleRate: 0,
      profilesSampleRate: 0.1,
      sendDefaultPii: false,
      integrations: [
        Sentry.browserTracingIntegration({
          enableLongTask: true,
          enableInp: true,
        }),
        Sentry.feedbackIntegration({ autoInject: false }),
        Sentry.extraErrorDataIntegration({ depth: 4 }),
      ],
      ignoreErrors: [
        /HTTP Client Error with status code/,
        /Failed to fetch/,
        /Load failed/,
        /NetworkError/,
        /AbortError/,
        /The operation was aborted/,
        /ResizeObserver loop/,
        /Non-Error promise rejection captured/,
        /Object captured as promise rejection/,
        /ChunkLoadError/,
        /Importing a module script failed/,
        /Failed to fetch dynamically imported module/,
        /Unable to preload CSS/,
        /net::ERR_/,
      ],
      beforeSend(event) {
        const msg = event.exception?.values?.[0]?.value || event.message || "";
        if (NOISE_PATTERNS.some(p => msg.includes(p))) return null;
        for (const v of event.exception?.values ?? []) {
          if (NOISE_PATTERNS.some(p => (v.value || "").includes(p))) return null;
        }
        if (event.extra) {
          event.extra = scrubEventData(event.extra as Record<string, any>);
        }
        if (event.contexts) {
          for (const [key, ctx] of Object.entries(event.contexts)) {
            if (ctx && typeof ctx === "object") {
              event.contexts[key] = scrubEventData(ctx as Record<string, any>);
            }
          }
        }
        return event;
      },
      beforeSendTransaction(event) {
        const op = event.contexts?.trace?.op || "";
        if (op === "http.client") {
          const status = event.contexts?.response?.status_code;
          if (status && status >= 500 && status <= 504) return null;
        }
        return event;
      },
      beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === "console" && breadcrumb.level === "debug") return null;
        if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
          const status = breadcrumb.data?.status_code;
          if (status && status >= 500 && status <= 504) return null;
        }
        if (breadcrumb.data) {
          breadcrumb.data = scrubEventData(breadcrumb.data);
        }
        return breadcrumb;
      },
      denyUrls: [
        /extensions\//i,
        /^chrome:\/\//i,
        /^moz-extension:\/\//i,
        /googletagmanager\.com/i,
        /analytics\.google\.com/i,
        /\/@vite\//i,
        /__vite_ping/i,
        /overpass-api\.de/i,
        /rainviewer\.com/i,
        /open-meteo\.com/i,
      ],
      tracePropagationTargets: ["localhost", /\.supabase\.co/, /\.replit\.dev/],
    });
    Sentry.setTag("app.version", APP_VERSION);
    Sentry.setTag("boot.phase", "pre-mount");
  } catch {
    _bootInitialized = false;
  }
}

/**
 * Captures a boot crash with Sentry. Safe to call before/after `initSentryBoot`
 * and regardless of whether Sentry has a DSN — falls back silently.
 */
export function captureBootCrash(error: unknown, extra?: Record<string, unknown>) {
  try {
    Sentry.captureException(error, {
      tags: { boot: "crash", "app.version": APP_VERSION },
      extra: { ...extra, buildId: APP_VERSION },
    });
  } catch {
    // swallow — we never want boot crash reporting to itself crash
  }
}

/**
 * Reports the time to first render. If `durationMs` exceeds the budget
 * (default 8s), a Sentry message is fired tagged as a boot-slow event.
 */
export function reportTimeToFirstRender(durationMs: number, thresholdMs = 8000) {
  try {
    // Record as a custom measurement when the SDK supports it (not part of the
    // public @sentry/react surface in all versions).
    const maybeSetMeasurement = (Sentry as unknown as {
      setMeasurement?: (name: string, value: number, unit: string) => void;
    }).setMeasurement;
    if (typeof maybeSetMeasurement === "function") {
      maybeSetMeasurement("time_to_first_render", durationMs, "millisecond");
    }
    if (durationMs > thresholdMs) {
      Sentry.captureMessage(`Slow boot: time-to-first-render ${Math.round(durationMs)}ms`, {
        level: "warning",
        tags: {
          boot: "slow",
          "app.version": APP_VERSION,
        },
        extra: { durationMs, thresholdMs, buildId: APP_VERSION },
      });
    }
  } catch {
    // swallow
  }
}

/**
 * Upgrades the boot-time Sentry client with consent-gated features.
 *
 * The heavy crash/tracing/breadcrumb pipeline is already running from
 * `initSentryBoot()`. This function's job is narrower: if analytics consent
 * has been granted, attach the Session Replay integration (which can record
 * sensitive user input) and flip the tag to indicate we're past mount.
 *
 * Falls back to a cold `Sentry.init(...)` only when `initSentryBoot()` was
 * unable to run (no DSN at boot, or it threw). This keeps a single source
 * of configuration while still handling the rare "booted without DSN, got
 * one later" case defensively.
 */
export function initSentry() {
  if (_initialized) return;
  if (!isCategoryAllowed("analytics")) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  _initialized = true;

  // Boot-time init ran: upgrade the existing client instead of re-initing.
  if (_bootInitialized) {
    try {
      Sentry.addIntegration(Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: false,
      }));
    } catch {
      // Replay attach is best-effort; crash tracking is already live.
    }
    try {
      Sentry.setTag("app.version", APP_VERSION);
      Sentry.setTag("boot.phase", "post-mount");
      Sentry.setTag("replay.enabled", "true");
    } catch {}
    return;
  }

  // Fallback cold init path — boot init didn't run, so wire the full config
  // here (mirrors `initSentryBoot()` plus the Replay integration).
  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    release: APP_VERSION,
    tracesSampler,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    profilesSampleRate: 0.1,
    integrations: [
      Sentry.browserTracingIntegration({
        enableLongTask: true,
        enableInp: true,
      }),
      Sentry.replayIntegration({
        maskAllText: true,
        maskAllInputs: true,
        blockAllMedia: false,
      }),
      Sentry.feedbackIntegration({ autoInject: false }),
      Sentry.extraErrorDataIntegration({ depth: 4 }),
    ],
    ignoreErrors: [
      /HTTP Client Error with status code/,
      /Failed to fetch/,
      /Load failed/,
      /NetworkError/,
      /AbortError/,
      /The operation was aborted/,
      /ResizeObserver loop/,
      /Non-Error promise rejection captured/,
      /Object captured as promise rejection/,
      /ChunkLoadError/,
      /Importing a module script failed/,
      /Failed to fetch dynamically imported module/,
      /Unable to preload CSS/,
      /net::ERR_/,
    ],
    beforeSend(event) {
      const msg = event.exception?.values?.[0]?.value || event.message || "";
      if (NOISE_PATTERNS.some(p => msg.includes(p))) return null;
      for (const v of event.exception?.values ?? []) {
        if (NOISE_PATTERNS.some(p => (v.value || "").includes(p))) return null;
      }
      if (event.extra) {
        event.extra = scrubEventData(event.extra as Record<string, any>);
      }
      if (event.contexts) {
        for (const [key, ctx] of Object.entries(event.contexts)) {
          if (ctx && typeof ctx === "object") {
            event.contexts[key] = scrubEventData(ctx as Record<string, any>);
          }
        }
      }
      return event;
    },
    beforeSendTransaction(event) {
      const op = event.contexts?.trace?.op || "";
      if (op === "http.client") {
        const status = event.contexts?.response?.status_code;
        if (status && status >= 500 && status <= 504) return null;
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") return null;
      if (breadcrumb.category === "fetch" || breadcrumb.category === "xhr") {
        const status = breadcrumb.data?.status_code;
        if (status && status >= 500 && status <= 504) return null;
      }
      if (breadcrumb.data) {
        breadcrumb.data = scrubEventData(breadcrumb.data);
      }
      return breadcrumb;
    },
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /googletagmanager\.com/i,
      /analytics\.google\.com/i,
      /\/@vite\//i,
      /__vite_ping/i,
      /overpass-api\.de/i,
      /rainviewer\.com/i,
      /open-meteo\.com/i,
    ],
    tracePropagationTargets: ["localhost", /\.supabase\.co/, /\.replit\.dev/],
  });

  Sentry.setTag("app.version", APP_VERSION);
  Sentry.setTag("boot.phase", "post-mount");
  Sentry.setTag("replay.enabled", "true");
}

export function setUserContext(userId: string, email?: string, extra?: { role?: string; orgId?: string }) {
  Sentry.setUser({ id: userId, email });
  if (extra?.role) Sentry.setTag("user.role", extra.role);
  if (extra?.orgId) Sentry.setTag("user.orgId", extra.orgId);
}

export function setSectionContext(section: string, route?: string) {
  Sentry.setTag("app.section", section);
  if (route) Sentry.setTag("app.route", route);
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function captureDinoError(message: string, extra?: Record<string, unknown>) {
  Sentry.captureMessage(message, { level: "error", extra });
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category, message, data, level: "info" });
}

export function captureUIAnomaly(component: string, issue: string, meta?: Record<string, unknown>) {
  Sentry.captureMessage(`[UI] ${component}: ${issue}`, {
    level: "warning",
    tags: { anomalyType: "ui", component },
    extra: meta,
  });
}

export function startSpan(name: string, op: string) {
  return Sentry.startInactiveSpan({ name, op });
}

export function measureRender(componentName: string, durationMs: number) {
  if (durationMs > 500) {
    Sentry.captureMessage(`[SlowRender] ${componentName} took ${durationMs}ms`, {
      level: "warning",
      tags: { anomalyType: "performance", component: componentName },
      extra: { durationMs },
    });
  }
}

/**
 * Health probe for the Sentry integration registry. Reports OK when a DSN is
 * configured and the boot- or post-mount init has run; reports a clear reason
 * otherwise so the admin diagnostics page can flag the silent no-op case.
 */
export function getSentryHealth(): { ok: boolean; reason?: string } {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return { ok: false, reason: "VITE_SENTRY_DSN is not set" };
  if (!_bootInitialized && !_initialized) {
    return { ok: false, reason: "Sentry SDK has not been initialised yet" };
  }
  return { ok: true };
}

export { Sentry };
