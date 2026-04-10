import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";
import { platformBus } from "@/lib/shared/platform-bus";

export class RollbackTriggerEngine extends BaseEngine {
  private criticalThresholds = {
    errorRate: 0.15,
    consecutiveErrors: 10,
    memoryPercent: 0.95,
  };
  private consecutiveHighError = 0;

  constructor() {
    super({
      id: "release-rollback-trigger",
      name: "Rollback Trigger Engine",
      category: "release",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const report = engineObserver.getReport();
    const errorRate = report.totalTicks > 0 ? report.totalErrors / report.totalTicks : 0;

    if (errorRate > this.criticalThresholds.errorRate) {
      this.consecutiveHighError++;
      findings.push(`Critical error rate: ${Math.round(errorRate * 100)}% (cycle ${this.consecutiveHighError})`);

      if (this.consecutiveHighError >= 3) {
        platformBus.emit("engine:rollback:recommended" as any, {
          reason: "sustained-high-error-rate",
          errorRate,
          cycles: this.consecutiveHighError,
        });
        actions.push("Rollback recommended — sustained critical error rate");
      }
    } else {
      this.consecutiveHighError = 0;
    }

    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize / mem.jsHeapSizeLimit > this.criticalThresholds.memoryPercent) {
      findings.push(`Critical memory: ${Math.round(mem.usedJSHeapSize / 1048576)}MB`);
      platformBus.emit("engine:rollback:memory-critical" as any, { used: mem.usedJSHeapSize, limit: mem.jsHeapSizeLimit });
    }

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "propose" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
