import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

export class ReleaseImpactEngine extends BaseEngine {
  private bootMetrics: Array<{ version: string; bootTime: number; errorRate: number; ts: number }> = [];

  constructor() {
    super({
      id: "obs-release-impact",
      name: "Release Impact Engine",
      category: "observability",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    const loadTime = nav ? nav.loadEventEnd - nav.startTime : 0;

    const report = engineObserver.getReport();
    const errorRate = report.totalTicks > 0 ? report.totalErrors / report.totalTicks : 0;

    const version = (window as any).__EL_VERSION || "unknown";
    this.bootMetrics.push({ version, bootTime: loadTime, errorRate, ts: Date.now() });
    if (this.bootMetrics.length > 50) this.bootMetrics = this.bootMetrics.slice(-50);

    if (loadTime > 5000) {
      findings.push(`Slow page load: ${Math.round(loadTime)}ms`);
    }
    if (errorRate > 0.1) {
      findings.push(`High engine error rate: ${Math.round(errorRate * 100)}%`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
