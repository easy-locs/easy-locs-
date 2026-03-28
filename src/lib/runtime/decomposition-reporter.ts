/**
 * decomposition-reporter — Atomic unit: report on module coupling and decomposition health.
 * Single responsibility: generate actionable decomposition priority reports.
 */
import { computeCouplingReports, getOverCoupledModules } from "./coupling-detector";
import { getDeadEvents, getMismatchedEvents } from "./event-audit";
import { getBrokenPropagations } from "./propagation-validator";
import { getStaleEntries } from "./cache-validator";
import { checkStaleness } from "./realtime-monitor";

export interface DecompositionReport {
  overCoupledModules: string[];
  deadEventCount: number;
  mismatchedEventCount: number;
  brokenPropagationCount: number;
  staleCacheCount: number;
  staleRealtimeCount: number;
  priority: "critical" | "warning" | "healthy";
  recommendations: string[];
}

export function generateDecompositionReport(): DecompositionReport {
  const overCoupled = getOverCoupledModules();
  const deadEvents = getDeadEvents();
  const mismatched = getMismatchedEvents();
  const broken = getBrokenPropagations();
  const staleCache = getStaleEntries();
  const staleRT = checkStaleness().filter(c => c.status === "stale" || c.status === "dead");

  const recommendations: string[] = [];

  if (overCoupled.length > 0) {
    recommendations.push(`Decouple modules: ${overCoupled.map(m => m.module).join(", ")}`);
  }
  if (deadEvents.length > 0) {
    recommendations.push(`Wire consumers for ${deadEvents.length} dead events: ${deadEvents.map(e => e.event).join(", ")}`);
  }
  if (broken.length > 0) {
    recommendations.push(`Fix ${broken.length} broken propagation flows`);
  }
  if (staleCache.length > 0) {
    recommendations.push(`Invalidate ${staleCache.length} stale cache entries`);
  }
  if (staleRT.length > 0) {
    recommendations.push(`Reconnect ${staleRT.length} stale realtime channels`);
  }

  const score = overCoupled.length * 3 + deadEvents.length * 2 + broken.length * 2 + staleCache.length + staleRT.length;
  const priority = score > 10 ? "critical" : score > 3 ? "warning" : "healthy";

  return {
    overCoupledModules: overCoupled.map(m => m.module),
    deadEventCount: deadEvents.length,
    mismatchedEventCount: mismatched.length,
    brokenPropagationCount: broken.length,
    staleCacheCount: staleCache.length,
    staleRealtimeCount: staleRT.length,
    priority,
    recommendations,
  };
}
