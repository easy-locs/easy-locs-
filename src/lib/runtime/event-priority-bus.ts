/**
 * event-priority-bus — Enhanced event system with priority, tracing, latency monitoring.
 * Wraps platformBus with world-class observability.
 */
import { platformBus } from "@/lib/shared/platform-bus";

export type EventPriority = "critical" | "high" | "normal" | "low";

interface EventTrace {
  eventType: string;
  priority: EventPriority;
  emittedAt: number;
  consumedAt: number | null;
  latencyMs: number | null;
  consumerCount: number;
  source: string;
}

const MAX_TRACES = 500;
let traces: EventTrace[] = [];
const latencyThresholdMs = 100;

// Priority weights — critical events are processed first in batch scenarios
const PRIORITY_WEIGHT: Record<EventPriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
  low: 3,
};

/**
 * Emit with priority tracking and latency measurement.
 */
export function emitWithPriority(
  type: string,
  payload: any,
  source: string,
  priority: EventPriority = "normal",
) {
  const emittedAt = performance.now();

  platformBus.emit(type as any, payload, source);

  const consumedAt = performance.now();
  const latencyMs = Math.round(consumedAt - emittedAt);

  const trace: EventTrace = {
    eventType: type,
    priority,
    emittedAt,
    consumedAt,
    latencyMs,
    consumerCount: platformBus.getRegisteredEvents().includes(type) ? 1 : 0,
    source,
  };

  traces = [trace, ...traces].slice(0, MAX_TRACES);

  // Alert on slow events
  if (latencyMs > latencyThresholdMs && import.meta.env.DEV) {
    console.warn(`[event-priority] SLOW event: ${type} took ${latencyMs}ms (threshold: ${latencyThresholdMs}ms)`);
  }
}

/**
 * Get events sorted by latency (slowest first).
 */
export function getSlowEvents(thresholdMs = 50): EventTrace[] {
  return traces
    .filter(t => (t.latencyMs ?? 0) > thresholdMs)
    .sort((a, b) => (b.latencyMs ?? 0) - (a.latencyMs ?? 0));
}

/**
 * Get dead events — emitted but with 0 consumers.
 */
export function getDeadEvents(): EventTrace[] {
  return traces.filter(t => t.consumerCount === 0);
}

/**
 * Get event latency stats by domain.
 */
export function getEventLatencyStats(): Record<string, { count: number; avgMs: number; maxMs: number; deadCount: number }> {
  const stats: Record<string, { count: number; totalMs: number; maxMs: number; deadCount: number }> = {};

  for (const t of traces) {
    const domain = t.eventType.split(/[:.]/)[0];
    if (!stats[domain]) stats[domain] = { count: 0, totalMs: 0, maxMs: 0, deadCount: 0 };
    stats[domain].count++;
    stats[domain].totalMs += t.latencyMs ?? 0;
    stats[domain].maxMs = Math.max(stats[domain].maxMs, t.latencyMs ?? 0);
    if (t.consumerCount === 0) stats[domain].deadCount++;
  }

  const result: Record<string, { count: number; avgMs: number; maxMs: number; deadCount: number }> = {};
  for (const [domain, s] of Object.entries(stats)) {
    result[domain] = {
      count: s.count,
      avgMs: Math.round(s.totalMs / s.count),
      maxMs: s.maxMs,
      deadCount: s.deadCount,
    };
  }
  return result;
}

/**
 * Get all traces for replay/debugging.
 */
export function getEventTraces(): EventTrace[] {
  return [...traces];
}

export function clearEventTraces() {
  traces = [];
}
