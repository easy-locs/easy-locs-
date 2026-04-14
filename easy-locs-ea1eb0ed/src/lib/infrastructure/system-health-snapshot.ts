import { getAllHealth, getGlobalStatus } from "@/lib/runtime/health-aggregator";
import { getEventTraces, getEventLatencyStats } from "@/lib/runtime/event-priority-bus";
import { getFlowReport, runFullFlowValidation } from "@/lib/runtime/flow-completeness-validator";
import { domainCircuitBreaker } from "./domain-circuit-breaker";
import { backpressureManager } from "./backpressure-manager";
import { slaEngineManager } from "./sla-engine-contracts";
import { adaptiveStormGuard } from "./adaptive-storm-guard";
import { getRecentTraces } from "./distributed-tracing";
import { getLoopAlerts, detectCycles } from "./flow-cycle-detector";
import { adaptiveRetry } from "./adaptive-retry";
import { deadEventCleanup } from "./dead-event-cleanup";

export interface SystemHealthSnapshot {
  timestamp: number;
  globalStatus: string;
  modules: {
    module: string;
    status: string;
    failureCount: number;
    avgLatencyMs: number;
  }[];
  eventBus: {
    latencyStats: Record<
      string,
      { count: number; avgMs: number; maxMs: number; deadCount: number }
    >;
    recentTraceCount: number;
    totalEventTraces: number;
  };
  flows: {
    totalFlows: number;
    healthyFlows: number;
    brokenFlows: number;
    incompleteFlows: number;
    deadEvents: string[];
    overall: string;
  };
  circuitBreakers: {
    totalCircuits: number;
    openCircuits: string[];
    halfOpenCircuits: string[];
    totalDeadLetters: number;
  };
  backpressure: {
    totalQueueDepth: number;
    queueDepthByDomain: Record<string, number>;
    backpressuredEvents: string[];
  };
  sla: {
    totalSLAs: number;
    totalViolations: number;
    quarantinedEngines: string[];
    recentViolations: Array<{
      engineId: string;
      type: string;
      threshold: number;
      actual: number;
    }>;
  };
  stormGuard: {
    totalPrefixes: number;
    suppressedPrefixes: string[];
    totalAlerts: number;
  };
  tracing: {
    recentTraces: Array<{
      traceId: string;
      spanCount: number;
      totalDurationMs: number;
      hasErrors: boolean;
    }>;
  };
  cycles: {
    hasCycles: boolean;
    cycleCount: number;
    loopAlertCount: number;
  };
  retry: {
    totalRetries: number;
    successfulRetries: number;
    exhaustedRetries: number;
    currentLoadFactor: number;
  };
  deadEvents: {
    totalTracked: number;
    activeDeadEvents: number;
    cleanedEvents: number;
    totalCleanups: number;
  };
  scores: {
    overall: number;
    eventBusHealth: number;
    flowHealth: number;
    circuitHealth: number;
    slaCompliance: number;
  };
}

function computeScore(
  healthy: number,
  total: number,
  penalty: number = 0,
): number {
  if (total === 0) return 100;
  const base = (healthy / total) * 100;
  return Math.max(0, Math.round(base - penalty));
}

export function getSystemHealthSnapshot(): SystemHealthSnapshot {
  const moduleHealth = getAllHealth();
  const globalStatus = getGlobalStatus();
  const eventTraces = getEventTraces();
  const latencyStats = getEventLatencyStats();
  const flowValidation = runFullFlowValidation();
  const flowReport = getFlowReport();
  const cbReport = domainCircuitBreaker.getReport();
  const bpMetrics = backpressureManager.getQueueMetrics();
  const slaReport = slaEngineManager.getReport();
  const stormReport = adaptiveStormGuard.getReport();
  const recentTraces = getRecentTraces(20);
  const cycleResult = detectCycles();
  const loopAlerts = getLoopAlerts();
  const retryReport = adaptiveRetry.getReport();
  const deadEventReport = deadEventCleanup.getReport();

  const healthyModules = moduleHealth.filter((m) => m.status === "ok").length;
  const totalModules = moduleHealth.length;

  const eventBusHealthScore = computeScore(
    Object.values(latencyStats).filter((s) => s.deadCount === 0).length,
    Object.values(latencyStats).length,
  );

  const flowHealthScore = computeScore(
    flowValidation.healthyFlows,
    flowValidation.totalFlows,
  );

  const circuitHealthScore = computeScore(
    cbReport.closedCircuits.length,
    cbReport.totalCircuits,
    cbReport.openCircuits.length * 20,
  );

  const slaComplianceScore = computeScore(
    slaReport.totalSLAs - slaReport.quarantinedEngines.length,
    slaReport.totalSLAs,
    slaReport.totalViolations > 0 ? Math.min(30, slaReport.totalViolations * 5) : 0,
  );

  const overallScore = Math.round(
    (computeScore(healthyModules, totalModules) * 0.3 +
      eventBusHealthScore * 0.15 +
      flowHealthScore * 0.25 +
      circuitHealthScore * 0.15 +
      slaComplianceScore * 0.15),
  );

  const backpressuredEvents = bpMetrics
    .filter((m) => m.isBackpressured)
    .map((m) => m.eventType);

  return {
    timestamp: Date.now(),
    globalStatus,
    modules: moduleHealth.map((m) => ({
      module: m.module,
      status: m.status,
      failureCount: m.failureCount,
      avgLatencyMs: m.avgLatencyMs,
    })),
    eventBus: {
      latencyStats,
      recentTraceCount: recentTraces.length,
      totalEventTraces: eventTraces.length,
    },
    flows: {
      totalFlows: flowValidation.totalFlows,
      healthyFlows: flowValidation.healthyFlows,
      brokenFlows: flowValidation.brokenFlows,
      incompleteFlows: flowValidation.incompleteFlows,
      deadEvents: flowValidation.deadEvents,
      overall: flowValidation.overall,
    },
    circuitBreakers: {
      totalCircuits: cbReport.totalCircuits,
      openCircuits: cbReport.openCircuits,
      halfOpenCircuits: cbReport.halfOpenCircuits,
      totalDeadLetters: cbReport.totalDeadLetters,
    },
    backpressure: {
      totalQueueDepth: backpressureManager.getTotalQueueDepth(),
      queueDepthByDomain: backpressureManager.getQueueDepthByDomain(),
      backpressuredEvents,
    },
    sla: {
      totalSLAs: slaReport.totalSLAs,
      totalViolations: slaReport.totalViolations,
      quarantinedEngines: slaReport.quarantinedEngines,
      recentViolations: slaReport.recentViolations.slice(-10).map((v) => ({
        engineId: v.engineId,
        type: v.violationType,
        threshold: v.threshold,
        actual: v.actual,
      })),
    },
    stormGuard: {
      totalPrefixes: stormReport.totalPrefixes,
      suppressedPrefixes: stormReport.suppressedPrefixes,
      totalAlerts: stormReport.totalAlerts,
    },
    tracing: {
      recentTraces,
    },
    cycles: {
      hasCycles: cycleResult.hasCycle,
      cycleCount: cycleResult.cycles.length,
      loopAlertCount: loopAlerts.length,
    },
    retry: {
      totalRetries: retryReport.totalRetries,
      successfulRetries: retryReport.successfulRetries,
      exhaustedRetries: retryReport.exhaustedRetries,
      currentLoadFactor: retryReport.currentLoadFactor,
    },
    deadEvents: {
      totalTracked: deadEventReport.totalTracked,
      activeDeadEvents: deadEventReport.activeDeadEvents,
      cleanedEvents: deadEventReport.cleanedEvents,
      totalCleanups: deadEventReport.totalCleanups,
    },
    scores: {
      overall: overallScore,
      eventBusHealth: eventBusHealthScore,
      flowHealth: flowHealthScore,
      circuitHealth: circuitHealthScore,
      slaCompliance: slaComplianceScore,
    },
  };
}
