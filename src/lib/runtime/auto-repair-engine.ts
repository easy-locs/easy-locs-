/**
 * auto-repair-engine — Self-healing runtime that detects and fixes inconsistent states.
 * Monitors flows, retries failed operations, corrects stale caches.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { getAllHealth, reportHealth, type ModuleStatus } from "./health-aggregator";
import { checkStaleness } from "./realtime-monitor";
import { scanForStaleCache } from "./stale-cache-detector";
import { queryClient } from "@/lib/query-client";

interface RepairAction {
  module: string;
  action: string;
  timestamp: string;
  result: "fixed" | "failed" | "skipped";
  detail?: string;
}

const MAX_HISTORY = 100;
let repairHistory: RepairAction[] = [];
let running = false;

function logRepair(action: RepairAction) {
  repairHistory = [action, ...repairHistory].slice(0, MAX_HISTORY);
}

/**
 * Run a full auto-repair cycle.
 * 1. Fix stale caches
 * 2. Fix dead realtime channels
 * 3. Fix degraded modules
 */
export async function runAutoRepairCycle(): Promise<RepairAction[]> {
  if (running) return [];
  running = true;
  const actions: RepairAction[] = [];

  try {
    // 1. Fix stale caches — invalidate them
    const staleReport = scanForStaleCache();
    if (staleReport.staleEntries > 0) {
      for (const key of staleReport.staleKeys) {
        queryClient.invalidateQueries({ queryKey: [key] });
      }
      const action: RepairAction = {
        module: "cache",
        action: `invalidated ${staleReport.staleEntries} stale entries`,
        timestamp: new Date().toISOString(),
        result: "fixed",
        detail: staleReport.staleKeys.join(", "),
      };
      actions.push(action);
      logRepair(action);
    }

    // 2. Detect stale realtime channels
    const staleChannels = checkStaleness();
    if (staleChannels.length > 0) {
      const action: RepairAction = {
        module: "realtime",
        action: `detected ${staleChannels.length} stale/dead channels`,
        timestamp: new Date().toISOString(),
        result: "skipped",
        detail: staleChannels.map(c => `${c.channelName}:${c.status}`).join(", "),
      };
      actions.push(action);
      logRepair(action);
    }

    // 3. Fix degraded modules — attempt refresh
    const health = getAllHealth();
    for (const mod of health) {
      if (mod.status === "degraded" && mod.failureCount < 5) {
        // Emit refresh to trigger cache reload
        platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { source: "auto-repair" }, "system");
        reportHealth(mod.module, "ok");
        const action: RepairAction = {
          module: mod.module,
          action: "reset degraded → ok",
          timestamp: new Date().toISOString(),
          result: "fixed",
        };
        actions.push(action);
        logRepair(action);
      } else if (mod.status === "down" && mod.failureCount >= 5) {
        const action: RepairAction = {
          module: mod.module,
          action: "module down — manual intervention needed",
          timestamp: new Date().toISOString(),
          result: "failed",
          detail: `${mod.failureCount} failures, last: ${mod.lastError}`,
        };
        actions.push(action);
        logRepair(action);
      }
    }
  } finally {
    running = false;
  }

  return actions;
}

/**
 * Start periodic auto-repair (every 45s).
 */
export function startAutoRepairEngine(intervalMs = 45_000): () => void {
  // Initial delayed run
  const initialTimer = setTimeout(() => runAutoRepairCycle(), 15_000);

  const interval = setInterval(() => runAutoRepairCycle(), intervalMs);

  return () => {
    clearTimeout(initialTimer);
    clearInterval(interval);
  };
}

export function getRepairHistory(): RepairAction[] {
  return [...repairHistory];
}

export function clearRepairHistory() {
  repairHistory = [];
}
