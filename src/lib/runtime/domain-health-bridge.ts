/**
 * domain-health-bridge — Wires domain-specific hooks into the health aggregator.
 * Provides helper functions that domain hooks call on success/failure.
 * Lightweight — no business logic, just health signal forwarding.
 */

import { reportHealth, type ModuleStatus } from "./health-aggregator";
import { detectSlowFlow } from "./anomaly-detector";

/**
 * Report a domain operation result to the health aggregator.
 * Call this from domain hooks/services after any significant operation.
 */
export function reportDomainOp(
  domain: string,
  operation: string,
  success: boolean,
  latencyMs?: number,
  error?: string
) {
  const status: ModuleStatus = success ? "ok" : "degraded";
  reportHealth(domain, status, latencyMs, error);

  // Auto-detect slow operations
  if (latencyMs !== undefined) {
    detectSlowFlow(domain, operation, latencyMs);
  }

  if (!success && error) {
    console.warn(`[domain-health] ${domain}.${operation} failed:`, error);
  }
}

/**
 * Create a timed wrapper that auto-reports health.
 * Usage: const result = await withHealthTracking("wallet", "loadBalance", () => fetchBalance());
 */
export async function withHealthTracking<T>(
  domain: string,
  operation: string,
  fn: () => Promise<T>
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    reportDomainOp(domain, operation, true, Date.now() - start);
    return result;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    reportDomainOp(domain, operation, false, Date.now() - start, msg);
    throw err;
  }
}

/**
 * Wrap a React Query queryFn to auto-report health.
 */
export function healthTrackedQuery<T>(
  domain: string,
  operation: string,
  queryFn: () => Promise<T>
): () => Promise<T> {
  return () => withHealthTracking(domain, operation, queryFn);
}
