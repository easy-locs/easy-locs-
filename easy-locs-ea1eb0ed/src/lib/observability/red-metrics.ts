/**
 * RED metrics (Rate / Errors / Duration) aggregator.
 *
 * Fed from structured-logger entries (or direct `recordRed()` calls).
 * Computes per-domain+route rolling windows so dashboards can show
 * request rate, error %, and p50/p95/p99 latency.
 */

import type { LogDomain } from "./structured-logger";

export interface RedSample {
  domain: LogDomain | string;
  route?: string;
  action: string;
  duration_ms: number;
  error: boolean;
  timestamp: number;
}

export interface RedSnapshot {
  key: string;
  domain: string;
  route?: string;
  action: string;
  window_ms: number;
  count: number;
  errors: number;
  error_rate: number;
  rate_per_min: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
}

const BUFFER: RedSample[] = [];
const MAX_BUFFER = 5000;
const DEFAULT_WINDOW_MS = 5 * 60 * 1000;

export function recordRed(sample: Omit<RedSample, "timestamp"> & { timestamp?: number }): void {
  BUFFER.push({ ...sample, timestamp: sample.timestamp ?? Date.now() });
  if (BUFFER.length > MAX_BUFFER) BUFFER.splice(0, BUFFER.length - MAX_BUFFER);
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  const next = sorted[base + 1];
  return next !== undefined ? sorted[base] + rest * (next - sorted[base]) : sorted[base];
}

function keyOf(s: Pick<RedSample, "domain" | "route" | "action">): string {
  return `${s.domain}::${s.route ?? "-"}::${s.action}`;
}

export function snapshot(options: {
  windowMs?: number;
  domain?: string;
  route?: string;
} = {}): RedSnapshot[] {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const since = Date.now() - windowMs;

  const groups = new Map<string, RedSample[]>();
  for (const s of BUFFER) {
    if (s.timestamp < since) continue;
    if (options.domain && s.domain !== options.domain) continue;
    if (options.route && s.route !== options.route) continue;
    const k = keyOf(s);
    const list = groups.get(k);
    if (list) list.push(s);
    else groups.set(k, [s]);
  }

  const out: RedSnapshot[] = [];
  for (const [key, samples] of groups) {
    const durations = samples.map((s) => s.duration_ms).sort((a, b) => a - b);
    const errors = samples.filter((s) => s.error).length;
    const first = samples[0];
    out.push({
      key,
      domain: String(first.domain),
      route: first.route,
      action: first.action,
      window_ms: windowMs,
      count: samples.length,
      errors,
      error_rate: samples.length > 0 ? errors / samples.length : 0,
      rate_per_min: (samples.length / windowMs) * 60_000,
      p50: Math.round(quantile(durations, 0.5)),
      p95: Math.round(quantile(durations, 0.95)),
      p99: Math.round(quantile(durations, 0.99)),
      max: durations[durations.length - 1] ?? 0,
    });
  }
  out.sort((a, b) => b.count - a.count);
  return out;
}

export function snapshotByDomain(windowMs = DEFAULT_WINDOW_MS): Record<string, RedSnapshot> {
  const since = Date.now() - windowMs;
  const byDomain = new Map<string, RedSample[]>();
  for (const s of BUFFER) {
    if (s.timestamp < since) continue;
    const list = byDomain.get(String(s.domain));
    if (list) list.push(s);
    else byDomain.set(String(s.domain), [s]);
  }
  const out: Record<string, RedSnapshot> = {};
  for (const [domain, samples] of byDomain) {
    const durations = samples.map((s) => s.duration_ms).sort((a, b) => a - b);
    const errors = samples.filter((s) => s.error).length;
    out[domain] = {
      key: domain,
      domain,
      action: "*",
      window_ms: windowMs,
      count: samples.length,
      errors,
      error_rate: samples.length > 0 ? errors / samples.length : 0,
      rate_per_min: (samples.length / windowMs) * 60_000,
      p50: Math.round(quantile(durations, 0.5)),
      p95: Math.round(quantile(durations, 0.95)),
      p99: Math.round(quantile(durations, 0.99)),
      max: durations[durations.length - 1] ?? 0,
    };
  }
  return out;
}

export function clearRed(): void {
  BUFFER.length = 0;
}

export function getRedBuffer(): readonly RedSample[] {
  return BUFFER;
}
