import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class SilentRecoveryService extends BaseEngine {
  private recoveries: Array<{ type: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "sh-silent-recovery",
      name: "Silent Recovery Service",
      category: "self-healing",
      intervalMs: 20_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const actions: string[] = [];
    const findings: string[] = [];

    try {
      const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
      const failedFetches = entries.filter(e => {
        return e.responseStatus !== undefined && e.responseStatus >= 500 && e.startTime > performance.now() - this.intervalMs;
      });
      if (failedFetches.length > 0) {
        findings.push(`${failedFetches.length} server errors (5xx) in last cycle`);
      }
    } catch {}

    const scrollPos = window.scrollY;
    const viewportHeight = window.innerHeight;
    const docHeight = document.documentElement.scrollHeight;
    if (docHeight < viewportHeight && document.querySelectorAll("[data-loading]").length > 3) {
      findings.push("Possible stuck loading state — content area smaller than viewport with loading indicators");
    }

    if (navigator.onLine) {
      const connectionInfo = (navigator as any).connection;
      if (connectionInfo) {
        const effectiveType = connectionInfo.effectiveType;
        if (effectiveType === "slow-2g" || effectiveType === "2g") {
          findings.push(`Slow connection detected: ${effectiveType}`);
        }
      }
    }

    if (this.recoveries.length > 200) this.recoveries = this.recoveries.slice(-200);

    return {
      level: actions.length > 0 ? "act" : findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
