import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface FixAction {
  type: string;
  description: string;
  result: "success" | "failed" | "skipped";
  timestamp: number;
}

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

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    if (this.canRun("stale-query-refetch", 120_000)) {
      try {
        const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
        if (nav && nav.domContentLoadedEventEnd > 0) {
          const timeSinceLoad = performance.now();
          if (timeSinceLoad > 300_000) {
            this.emit("auto-fix:stale-check", { timeSinceLoad });
          }
        }
      } catch {}
    }

    if (this.canRun("offline-recovery", 60_000)) {
      if (navigator.onLine) {
        const wasOffline = sessionStorage.getItem("el-was-offline");
        if (wasOffline) {
          sessionStorage.removeItem("el-was-offline");
          platformBus.emit("system:online_recovered", { timestamp: Date.now() }, "system");
          actions.push("Online recovery triggered");
          this.cooldowns.set("offline-recovery", Date.now());
          this.fixHistory.push({ type: "offline-recovery", description: "Triggered sync after offline", result: "success", timestamp: Date.now() });
        }
      } else {
        sessionStorage.setItem("el-was-offline", "1");
        findings.push("Device currently offline");
      }
    }

    if (this.canRun("memory-pressure", 300_000)) {
      const mem = (performance as any).memory;
      if (mem && mem.usedJSHeapSize / mem.jsHeapSizeLimit > 0.85) {
        findings.push("Memory pressure detected (>85%)");
        this.emit("auto-fix:memory-pressure", { usage: mem.usedJSHeapSize });
        this.cooldowns.set("memory-pressure", Date.now());
      }
    }

    if (this.fixHistory.length > 200) this.fixHistory = this.fixHistory.slice(-200);

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
