/**
 * Pre-mount Sentry shim. Lets `main.tsx` keep its synchronous
 * `initSentryBoot()` / `captureBootCrash()` / `reportTimeToFirstRender()`
 * call sites without statically importing the heavy `@sentry/react`
 * SDK (~115 KB br) into the eager landing-page bundle.
 *
 * How it works:
 *   1. `initSentryBoot()` (sync, ~50 LOC, no deps) installs
 *      `window.onerror` and `unhandledrejection` listeners that push
 *      events into an in-memory queue.
 *   2. `captureBootCrash()` and `reportTimeToFirstRender()` also queue.
 *   3. Stage 1 of the boot pipeline (idle callback in `main.tsx`) calls
 *      `flushSentryBoot()`, which dynamically imports the real
 *      `@/lib/analytics/sentry` module, runs the real
 *      `initSentryBoot()` + `initSentry()`, then drains the queue so
 *      no early error is lost.
 */

type QueuedCrash = { kind: "crash"; error: unknown; extra?: Record<string, unknown> };
type QueuedTtfr = { kind: "ttfr"; durationMs: number; thresholdMs: number };
type QueuedItem = QueuedCrash | QueuedTtfr;

const queue: QueuedItem[] = [];
let listenersInstalled = false;
let flushed = false;

function pushCrash(error: unknown, extra?: Record<string, unknown>) {
  if (queue.length > 50) return;
  queue.push({ kind: "crash", error, extra });
}

export function initSentryBoot(): void {
  if (listenersInstalled) return;
  listenersInstalled = true;
  if (typeof window === "undefined") return;
  window.addEventListener("error", (event: ErrorEvent) => {
    pushCrash(event.error || new Error(event.message), {
      phase: "pre-mount",
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  });
  window.addEventListener("unhandledrejection", (event: PromiseRejectionEvent) => {
    pushCrash(event.reason, { phase: "pre-mount", source: "unhandledrejection" });
  });
}

export function captureBootCrash(error: unknown, extra?: Record<string, unknown>): void {
  pushCrash(error, extra);
}

export function reportTimeToFirstRender(durationMs: number, thresholdMs = 8000): void {
  if (queue.length > 50) return;
  queue.push({ kind: "ttfr", durationMs, thresholdMs });
}

/**
 * Lightweight Sentry health probe that does NOT pull in `@sentry/react`.
 * Mirrors the contract of `getSentryHealth()` in `sentry.ts` so that
 * `lib/integrations/health.ts` (statically reachable from the eager boot
 * graph) no longer drags the full SDK into the landing chunk.
 */
export function getSentryHealth(): { ok: boolean; reason?: string } {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) ?? undefined;
  if (!dsn) return { ok: false, reason: "VITE_SENTRY_DSN is not set" };
  if (!flushed) return { ok: false, reason: "Sentry SDK has not been initialised yet" };
  return { ok: true };
}

export async function flushSentryBoot(): Promise<void> {
  if (flushed) return;
  flushed = true;
  try {
    const real = await import("@/lib/analytics/sentry");
    real.initSentryBoot();
    real.initSentry();
    for (const item of queue.splice(0)) {
      if (item.kind === "crash") {
        real.captureBootCrash(item.error, item.extra);
      } else {
        real.reportTimeToFirstRender(item.durationMs, item.thresholdMs);
      }
    }
  } catch (err) {
    console.warn("[boot] flushSentryBoot failed", err);
  }
}
