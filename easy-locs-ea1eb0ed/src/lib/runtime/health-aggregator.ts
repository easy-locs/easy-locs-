/**
 * health-aggregator — Atomic runtime unit: aggregates module health into global status.
 * Single responsibility: per-module health state + global rollup.
 */

export type ModuleStatus = "ok" | "degraded" | "down" | "unknown";

export interface ModuleHealth {
  module: string;
  status: ModuleStatus;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  failureCount: number;
  avgLatencyMs: number;
  lastError: string | null;
  updatedAt: string;
}

const MODULES = [
  "orbit", "wallet", "payments", "orders", "delivery",
  "geo", "radar", "notifications", "realtime", "dashboard",
  "onboarding", "auth", "search", "checkout",
] as const;

type ModuleKey = typeof MODULES[number];

const state = new Map<string, ModuleHealth>();
const listeners = new Set<() => void>();

// Initialize all modules
for (const m of MODULES) {
  state.set(m, {
    module: m, status: "unknown",
    lastSuccessAt: null, lastFailureAt: null,
    failureCount: 0, avgLatencyMs: 0,
    lastError: null, updatedAt: new Date().toISOString(),
  });
}

function notify() { listeners.forEach(fn => fn()); }

export function reportHealth(module: string, status: ModuleStatus, latencyMs?: number, error?: string) {
  const now = new Date().toISOString();
  const existing = state.get(module) || {
    module, status: "unknown", lastSuccessAt: null, lastFailureAt: null,
    failureCount: 0, avgLatencyMs: 0, lastError: null, updatedAt: now,
  };

  existing.status = status;
  existing.updatedAt = now;

  if (status === "ok") {
    existing.lastSuccessAt = now;
    existing.failureCount = 0;
    if (latencyMs !== undefined) {
      existing.avgLatencyMs = existing.avgLatencyMs > 0
        ? Math.round((existing.avgLatencyMs + latencyMs) / 2)
        : latencyMs;
    }
  } else {
    existing.lastFailureAt = now;
    existing.failureCount++;
    if (error) existing.lastError = error;
  }

  state.set(module, existing);
  notify();
}

export function getModuleHealth(module: string): ModuleHealth | undefined {
  return state.get(module);
}

export function getAllHealth(): ModuleHealth[] {
  return Array.from(state.values());
}

export function getGlobalStatus(): ModuleStatus {
  const all = getAllHealth();
  if (all.some(m => m.status === "down")) return "down";
  if (all.some(m => m.status === "degraded")) return "degraded";
  if (all.every(m => m.status === "ok")) return "ok";
  return "unknown";
}

export function subscribeHealth(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
