import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface FixAction {
  type: string;
  description: string;
  result: "success" | "failed" | "skipped";
  timestamp: number;
}

const STALE_THRESHOLD_MS = 300_000;
const STALE_REFETCH_COOLDOWN_MS = 120_000;
const OFFLINE_COOLDOWN_MS = 60_000;
const MEMORY_COOLDOWN_MS = 300_000;

export class AutoFixEngine extends BaseEngine {
  private fixHistory: FixAction[] = [];
  private cooldowns: Map<string, number> = new Map();

  constructor() {
    super({
      id: "sh-auto-fix",
      name: "Auto Fix Engine",
      category: "self-healing",
      intervalMs: 45_000,
    });
  }

  private canRun(fixType: string, cooldownMs: number): boolean {
    const last = this.cooldowns.get(fixType) || 0;
    return Date.now() - last > cooldownMs;
  }

  private recordFix(type: string, description: string, result: "success" | "failed" | "skipped"): void {
    this.fixHistory.push({ type, description, result, timestamp: Date.now() });
    this.cooldowns.set(type, Date.now());
    if (this.fixHistory.length > 200) this.fixHistory = this.fixHistory.slice(-100);
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    if (this.canRun("stale-query-refetch", STALE_REFETCH_COOLDOWN_MS)) {
      try {
        const timeSinceLoad = performance.now();
        if (timeSinceLoad > STALE_THRESHOLD_MS && navigator.onLine && !document.hidden) {
          const lastRefetch = Number(sessionStorage.getItem("el-last-stale-refetch") || "0");
          const sinceRefetch = Date.now() - lastRefetch;
          if (sinceRefetch > STALE_REFETCH_COOLDOWN_MS) {
            platformBus.emit("system:stale_queries_detected", {
              timestamp: Date.now(),
              timeSinceLoad: Math.round(timeSinceLoad),
              reason: "idle_threshold",
            }, "system");
            sessionStorage.setItem("el-last-stale-refetch", String(Date.now()));
            actions.push("Triggered stale query refetch after idle threshold");
            this.recordFix("stale-query-refetch", `Refetch after ${Math.round(timeSinceLoad / 1000)}s idle`, "success");
          }
        }
      } catch {
        this.recordFix("stale-query-refetch", "Failed to check stale queries", "failed");
      }
    }

    if (this.canRun("offline-recovery", OFFLINE_COOLDOWN_MS)) {
      if (navigator.onLine) {
        const wasOffline = sessionStorage.getItem("el-was-offline");
        if (wasOffline) {
          sessionStorage.removeItem("el-was-offline");
          platformBus.emit("system:online_recovered", { timestamp: Date.now() }, "system");
          actions.push("Online recovery triggered");
          this.recordFix("offline-recovery", "Triggered sync after offline", "success");
        }
      } else {
        sessionStorage.setItem("el-was-offline", "1");
        findings.push("Device currently offline");
      }
    }

    if (this.canRun("memory-pressure", MEMORY_COOLDOWN_MS)) {
      const mem = (performance as any).memory;
      if (mem && mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.85) {
        findings.push("Memory pressure detected (>85%)");
        platformBus.emit("system:memory_pressure", {
          timestamp: Date.now(),
          usedBytes: mem.usedJSHeapSize,
          limitBytes: mem.jsHeapSizeLimit,
          ratio: mem.usedJSHeapSize / mem.jsHeapSizeLimit,
        }, "system");
        this.recordFix("memory-pressure", `Pressure at ${Math.round(100 * mem.usedJSHeapSize / mem.jsHeapSizeLimit)}%`, "success");
      }
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
