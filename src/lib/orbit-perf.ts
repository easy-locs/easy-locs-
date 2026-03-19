/**
 * orbit-perf — Lightweight performance instrumentation for Orbit.
 * Tracks mount times, route changes, and slow components.
 */

const perfLog: { name: string; durationMs: number; ts: number }[] = [];

export function trackMount(name: string, startTime: number) {
  const duration = performance.now() - startTime;
  perfLog.push({ name, durationMs: Math.round(duration * 100) / 100, ts: Date.now() });
  if (duration > 200) {
    console.warn(`[orbit-perf] Slow mount: ${name} took ${duration.toFixed(1)}ms`);
  }
}

export function trackRouteChange(from: string, to: string, durationMs: number) {
  perfLog.push({ name: `route:${from}→${to}`, durationMs: Math.round(durationMs * 100) / 100, ts: Date.now() });
  if (durationMs > 300) {
    console.warn(`[orbit-perf] Slow route: ${from} → ${to} took ${durationMs.toFixed(1)}ms`);
  }
}

export function getPerfLog() {
  return [...perfLog];
}

export function clearPerfLog() {
  perfLog.length = 0;
}
