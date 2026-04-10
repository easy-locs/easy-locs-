import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

export class CanaryControlEngine extends BaseEngine {
  private baselineErrorRate: number | null = null;

  constructor() {
    super({
      id: "release-canary",
      name: "Canary Control Engine",
      category: "release",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const report = engineObserver.getReport();
    const currentErrorRate = report.totalTicks > 0 ? report.totalErrors / report.totalTicks : 0;

    if (this.baselineErrorRate === null) {
      this.baselineErrorRate = currentErrorRate;
    } else {
      const increase = currentErrorRate - this.baselineErrorRate;
      if (increase > 0.05) {
        findings.push(`Error rate increased: ${Math.round(this.baselineErrorRate * 100)}% → ${Math.round(currentErrorRate * 100)}% — canary alert`);
      }

      this.baselineErrorRate = this.baselineErrorRate * 0.9 + currentErrorRate * 0.1;
    }

    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming;
    if (nav && nav.loadEventEnd > 8000) {
      findings.push(`Page load degradation: ${Math.round(nav.loadEventEnd)}ms`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
