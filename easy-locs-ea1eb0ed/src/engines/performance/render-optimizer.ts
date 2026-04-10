import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class RenderOptimizer extends BaseEngine {
  private lastDomCount = 0;

  constructor() {
    super({
      id: "perf-render",
      name: "Render Optimizer",
      category: "performance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const domCount = document.querySelectorAll("*").length;
    if (this.lastDomCount > 0) {
      const growth = domCount - this.lastDomCount;
      if (growth > 500) {
        findings.push(`DOM growth: +${growth} nodes since last check (${this.lastDomCount} → ${domCount})`);
      }
    }
    this.lastDomCount = domCount;

    const images = document.querySelectorAll("img:not([loading])");
    let lazyMissing = 0;
    images.forEach(img => {
      const rect = img.getBoundingClientRect();
      if (rect.top > window.innerHeight * 2) lazyMissing++;
    });
    if (lazyMissing > 5) {
      findings.push(`${lazyMissing} below-fold images without lazy loading`);
    }

    const hiddenNodes = document.querySelectorAll('[style*="display: none"], [hidden]');
    if (hiddenNodes.length > 50) {
      findings.push(`${hiddenNodes.length} hidden DOM nodes — consider unmounting`);
    }

    const canvases = document.querySelectorAll("canvas");
    if (canvases.length > 3) {
      findings.push(`${canvases.length} canvas elements active — check for unused`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
