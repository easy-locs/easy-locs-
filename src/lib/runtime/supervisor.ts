/**
 * supervisor — Thin orchestrator: wires all runtime units into a single observable surface.
 * NOT a monolith — delegates entirely to atomic units.
 * Single responsibility: provide a unified read-only snapshot of platform runtime state.
 */

import { getTraces, type FlowTrace } from "./flow-tracer";
import { getAllHealth, getGlobalStatus, type ModuleHealth, type ModuleStatus } from "./health-aggregator";
import { getAnomalies, type Anomaly } from "./anomaly-detector";
import { getAllChannels, checkStaleness, type RealtimeChannelState } from "./realtime-monitor";
import { getDeadEvents, getMismatchedEvents, getAllEventRecords } from "./event-audit";
import { getStaleEntries } from "./cache-validator";

export interface RuntimeSnapshot {
  timestamp: string;
  globalStatus: ModuleStatus;
  modules: ModuleHealth[];
  flows: {
    total: number;
    running: number;
    failed: number;
    slowest: FlowTrace | null;
  };
  anomalies: {
    total: number;
    unresolved: number;
    critical: number;
    items: Anomaly[];
  };
  realtime: {
    channels: number;
    stale: number;
    dead: number;
    items: RealtimeChannelState[];
  };
  events: {
    dead: number;
    mismatched: number;
    total: number;
  };
  cache: {
    stale: number;
    total: number;
  };
}

export function getRuntimeSnapshot(): RuntimeSnapshot {
  const traces = getTraces();
  const anomalies = getAnomalies();
  const channels = getAllChannels();
  const staleChannels = checkStaleness();
  const deadEvents = getDeadEvents();
  const mismatchedEvents = getMismatchedEvents();
  const staleCache = getStaleEntries();

  const running = traces.filter(t => t.status === "running");
  const failed = traces.filter(t => t.status === "failed");
  const slowest = traces.length > 0
    ? traces.reduce((a, b) => (a.totalLatencyMs ?? 0) > (b.totalLatencyMs ?? 0) ? a : b)
    : null;

  const unresolvedAnomalies = anomalies.filter(a => !a.resolved);
  const criticalAnomalies = unresolvedAnomalies.filter(a => a.severity === "critical");

  return {
    timestamp: new Date().toISOString(),
    globalStatus: getGlobalStatus(),
    modules: getAllHealth(),
    flows: {
      total: traces.length,
      running: running.length,
      failed: failed.length,
      slowest,
    },
    anomalies: {
      total: anomalies.length,
      unresolved: unresolvedAnomalies.length,
      critical: criticalAnomalies.length,
      items: unresolvedAnomalies.slice(0, 50),
    },
    realtime: {
      channels: channels.length,
      stale: staleChannels.filter(c => c.status === "stale").length,
      dead: staleChannels.filter(c => c.status === "dead").length,
      items: channels,
    },
    events: {
      dead: deadEvents.length,
      mismatched: mismatchedEvents.length,
      total: getAllEventRecords().length,
    },
    cache: {
      stale: staleCache.length,
      total: staleCache.length, // simplified
    },
  };
}
