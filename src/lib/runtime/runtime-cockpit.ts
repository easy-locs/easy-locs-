/**
 * runtime-cockpit — Unified runtime health dashboard data provider.
 * Aggregates all runtime signals into a single queryable report.
 */
import { getAllHealth, getGlobalStatus } from "./health-aggregator";
import { generateFullHealthReport } from "./domain-health-reporter";
import { getFlowReport, getFlowsByStatus } from "./flow-completeness-validator";
import { getBrokenPropagations, getPropagationStats } from "./propagation-validator";
import { getAllChannels, checkStaleness } from "./realtime-monitor";
import { scanForStaleCache } from "./stale-cache-detector";
import { getSlowEvents, getDeadEvents, getEventLatencyStats } from "./event-priority-bus";
import { getSlowFlows, getBrokenFlows, getFlowTraces } from "./flow-tracer";
import { getRepairHistory } from "./auto-repair-engine";

export interface RuntimeCockpitReport {
  timestamp: string;
  globalStatus: string;

  // Module health
  modules: ReturnType<typeof getAllHealth>;
  domainHealth: ReturnType<typeof generateFullHealthReport>;

  // Flows
  flows: {
    total: number;
    healthy: number;
    incomplete: number;
    broken: number;
  };

  // Propagation
  propagation: {
    brokenChains: number;
    stats: ReturnType<typeof getPropagationStats>;
  };

  // Realtime
  realtime: {
    activeChannels: number;
    staleChannels: number;
    deadChannels: number;
  };

  // Cache
  cache: {
    staleEntries: number;
    staleDomains: string[];
  };

  // Events
  events: {
    slowCount: number;
    deadCount: number;
    latencyByDomain: ReturnType<typeof getEventLatencyStats>;
  };

  // Flow performance
  flowPerformance: {
    slowFlows: number;
    brokenFlows: number;
    totalTraced: number;
  };

  // Auto-repair
  repairs: {
    recentActions: number;
    fixedCount: number;
    failedCount: number;
  };
}

/**
 * Generate a complete runtime cockpit report.
 */
export function generateCockpitReport(): RuntimeCockpitReport {
  const flowReport = getFlowReport();
  const healthy = getFlowsByStatus("healthy").length;
  const incomplete = getFlowsByStatus("incomplete").length;
  const broken = getFlowsByStatus("broken").length;

  const brokenProps = getBrokenPropagations();
  const channels = getAllChannels();
  const staleChannels = checkStaleness();
  const cacheReport = scanForStaleCache();

  const slowEvents = getSlowEvents();
  const deadEvents = getDeadEvents();

  const slowFlows = getSlowFlows();
  const brokenFlowTraces = getBrokenFlows();
  const allTraces = getFlowTraces();

  const repairs = getRepairHistory();

  return {
    timestamp: new Date().toISOString(),
    globalStatus: getGlobalStatus(),

    modules: getAllHealth(),
    domainHealth: generateFullHealthReport(),

    flows: {
      total: flowReport.length,
      healthy,
      incomplete,
      broken,
    },

    propagation: {
      brokenChains: brokenProps.length,
      stats: getPropagationStats(),
    },

    realtime: {
      activeChannels: channels.filter(c => c.status === "active").length,
      staleChannels: staleChannels.filter(c => c.status === "stale").length,
      deadChannels: staleChannels.filter(c => c.status === "dead").length,
    },

    cache: {
      staleEntries: cacheReport.staleEntries,
      staleDomains: cacheReport.staleDomains,
    },

    events: {
      slowCount: slowEvents.length,
      deadCount: deadEvents.length,
      latencyByDomain: getEventLatencyStats(),
    },

    flowPerformance: {
      slowFlows: slowFlows.length,
      brokenFlows: brokenFlowTraces.length,
      totalTraced: allTraces.length,
    },

    repairs: {
      recentActions: repairs.length,
      fixedCount: repairs.filter(r => r.result === "fixed").length,
      failedCount: repairs.filter(r => r.result === "failed").length,
    },
  };
}

/**
 * Log cockpit summary to console (dev mode).
 */
export function logCockpitSummary() {
  const report = generateCockpitReport();
  const status = report.globalStatus === "ok" ? "✅" : report.globalStatus === "degraded" ? "⚠️" : "❌";

  console.group(`[COCKPIT] ${status} System Health — ${report.timestamp}`);
  console.log(`Flows: ${report.flows.healthy}✅ ${report.flows.incomplete}⚠️ ${report.flows.broken}❌`);
  console.log(`Realtime: ${report.realtime.activeChannels} active, ${report.realtime.staleChannels} stale`);
  console.log(`Cache: ${report.cache.staleEntries} stale entries`);
  console.log(`Events: ${report.events.slowCount} slow, ${report.events.deadCount} dead`);
  console.log(`Repairs: ${report.repairs.fixedCount} fixed, ${report.repairs.failedCount} failed`);
  console.groupEnd();
}
