/**
 * Sentry Error Monitoring — Frontend errors, performance traces, session replay.
 * Safe no-op if DSN is missing.
 */

import * as Sentry from "@sentry/react";

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;
  if (!dsn) return;

  Sentry.init({
    dsn,
    tracesSampleRate: 0.2,
    replaysSessionSampleRate: 0.05,
    replaysOnErrorSampleRate: 1.0,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration(),
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
