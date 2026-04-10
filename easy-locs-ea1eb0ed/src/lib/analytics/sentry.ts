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
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
    ],
    beforeSend(event) {
      if (event.exception?.values) {
        for (const v of event.exception.values) {
          if (v.value?.includes("ResizeObserver") || v.value?.includes("ChunkLoadError")) {
            return null;
          }
        }
      }
      return event;
    },
    denyUrls: [
      /extensions\//i,
      /^chrome:\/\//i,
      /^moz-extension:\/\//i,
    ],
  });
}

export function captureDinoError(
  message: string,
  extra?: Record<string, unknown>,
) {
  Sentry.captureMessage(message, { level: "error", extra });
}

export function captureException(error: unknown, context?: Record<string, unknown>) {
  Sentry.captureException(error, { extra: context });
}

export function setUserContext(userId: string, email?: string) {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext() {
  Sentry.setUser(null);
}

export function addBreadcrumb(category: string, message: string, data?: Record<string, unknown>) {
  Sentry.addBreadcrumb({ category, message, data, level: "info" });
}

export { Sentry };
