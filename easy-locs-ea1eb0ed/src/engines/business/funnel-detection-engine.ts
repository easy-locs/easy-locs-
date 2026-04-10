import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class FunnelDetectionEngine extends BaseEngine {
  private pageViews: Array<{ path: string; ts: number }> = [];
  private lastPath = "";

  constructor() {
    super({
      id: "biz-funnel",
      name: "Funnel Detection Engine",
      category: "business",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const currentPath = window.location.pathname;
    if (currentPath !== this.lastPath) {
      this.pageViews.push({ path: currentPath, ts: Date.now() });
      if (this.pageViews.length > 100) this.pageViews = this.pageViews.slice(-100);
      this.lastPath = currentPath;
    }

    const recent = this.pageViews.filter(p => p.ts > Date.now() - 60_000);
    if (recent.length > 10) {
      findings.push(`Rapid navigation: ${recent.length} page changes in 60s — user may be lost`);
    }

    const backAndForth = new Map<string, number>();
    for (const pv of recent) {
      backAndForth.set(pv.path, (backAndForth.get(pv.path) || 0) + 1);
    }
    for (const [path, count] of backAndForth) {
      if (count >= 3) {
        findings.push(`User revisiting "${path}" ${count}x — navigation confusion`);
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
