import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class OptimisticUIEngine extends BaseEngine {
  private stuckOptimistic: Array<{ selector: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "orbit-optimistic-ui",
      name: "Optimistic UI Engine",
      category: "orbit",
      intervalMs: 10_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const pendingEls = document.querySelectorAll("[data-optimistic]");
    const now = Date.now();

    pendingEls.forEach(el => {
      const ts = parseInt(el.getAttribute("data-optimistic-ts") || "0", 10);
      if (ts > 0 && now - ts > 15_000) {
        findings.push("Stuck optimistic UI element (>15s pending)");
        this.stuckOptimistic.push({ selector: el.tagName, timestamp: now });
      }
    });

    const spinners = document.querySelectorAll("[data-loading], .animate-spin");
    let longSpinners = 0;
    spinners.forEach(s => {
      const loadingSince = parseInt(s.getAttribute("data-loading-since") || "0", 10);
      if (loadingSince > 0 && now - loadingSince > 10_000) longSpinners++;
    });
    if (longSpinners > 0) {
      findings.push(`${longSpinners} loading indicators stuck >10s`);
    }

    if (this.stuckOptimistic.length > 200) this.stuckOptimistic = this.stuckOptimistic.slice(-200);

    return {
      level: findings.length > 0 ? "detect" : "observe",
      findings: findings.length,
      actions,
      duration: 0,
    };
  }
}
