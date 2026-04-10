import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

interface ObservabilityFinding {
  type: "error_spike" | "slow_page" | "broken_flow" | "engine_failure" | "memory_leak";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

export class QualityObservabilityEngine extends BaseEngine {
  private findings: ObservabilityFinding[] = [];
  private score = 100;
  private errorBaseline = 0;

  constructor() {
    super({
      id: "quality-observability",
      name: "Observability Engine",
      category: "quality",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: ObservabilityFinding[] = [];

    const errorLog = (window as any).__el_error_log as Array<{ message: string; timestamp: number }> | undefined;
    if (errorLog) {
      const recentErrors = errorLog.filter(e => Date.now() - (e.timestamp || 0) < 60000);
      if (recentErrors.length > 10) {
        findings.push({
          type: "error_spike",
          severity: "high",
          detail: `${recentErrors.length} errors in the last 60 seconds — possible regression`,
          recommendation: "Check console for error patterns and recent changes",
        });
      }

      if (errorLog.length > this.errorBaseline + 50) {
        findings.push({
          type: "error_spike",
          severity: "medium",
          detail: `Error count jumped from ${this.errorBaseline} to ${errorLog.length}`,
          recommendation: "Investigate the error growth trend",
        });
      }
      this.errorBaseline = errorLog.length;
    }

    const navEntries = performance.getEntriesByType("navigation");
    if (navEntries.length > 0) {
      const navEntry = navEntries[0] as PerformanceNavigationTiming;
      const loadTime = navEntry.loadEventEnd - navEntry.startTime;
      if (loadTime > 5000) {
        findings.push({
          type: "slow_page",
          severity: "high",
          detail: `Page load time: ${Math.round(loadTime)}ms (target: <3000ms)`,
          recommendation: "Optimize initial bundle, defer non-critical resources",
        });
      }
    }

    const mem = (performance as any).memory;
    if (mem && mem.usedJSHeapSize > 300 * 1048576) {
      findings.push({
        type: "memory_leak",
        severity: "high",
        detail: `Heap usage: ${Math.round(mem.usedJSHeapSize / 1048576)}MB — possible memory leak`,
        recommendation: "Profile memory usage, check for detached DOM nodes and closure leaks",
      });
    }

    const report = engineObserver.getReport();
    const failingEngines = report.engines.filter(e => e.errorCount > e.tickCount * 0.3);
    for (const engine of failingEngines) {
      findings.push({
        type: "engine_failure",
        severity: "medium",
        detail: `Engine "${engine.engineId}" has ${engine.errorCount} errors in ${engine.tickCount} ticks (${Math.round(engine.errorCount / Math.max(1, engine.tickCount) * 100)}% failure rate)`,
        recommendation: "Investigate and fix the failing engine",
      });
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
