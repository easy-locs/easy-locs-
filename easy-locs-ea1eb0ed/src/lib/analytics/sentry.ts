import * as Sentry from "@sentry/react";

let _initialized = false;

export function initSentry() {
  if (_initialized) return;
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  _initialized = true;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE || "development",
    release: (window as any).__EASYLOCS_BUILD_ID__ || "unknown",
    tracesSampleRate: 0.3,
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
      Sentry.httpClientIntegration(),
      Sentry.reportingObserverIntegration(),
      Sentry.extraErrorDataIntegration({ depth: 4 }),
    ],
    beforeSend(event) {
      if (event.exception?.values) {
        for (const v of event.exception.values) {
          const msg = v.value || "";
          if (
            msg.includes("[SentryVerify]") ||
            msg.includes("ResizeObserver") ||
            msg.includes("ChunkLoadError") ||
            msg.includes("Importing a module script failed") ||
            msg.includes("Failed to fetch dynamically imported module") ||
            msg.includes("Unable to preload CSS") ||
            msg.includes("Load failed") ||
            msg.includes("NetworkError") ||
            msg.includes("AbortError") ||
            msg.includes("The operation was aborted")
          ) {
            return null;
          }
        }
      }
      return event;
    },
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "console" && breadcrumb.level === "debug") {
        return null;
      }
      return breadcrumb;
    },
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
      /googletagmanager\.com/i,
      /analytics\.google\.com/i,
    ],
    tracePropagationTargets: ["localhost", /\.supabase\.co/, /\.replit\.dev/],
  });
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

export { Sentry };
