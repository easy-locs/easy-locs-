import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class UXFrictionEngine extends BaseEngine {
  private clickWithoutAction: number = 0;
  private rageClicks: Array<{ x: number; y: number; ts: number }> = [];

  constructor() {
    super({
      id: "uiux-friction",
      name: "UX Friction Engine",
      category: "uiux",
      intervalMs: 15_000,
    });
    this.installTracking();
  }

  private installTracking(): void {
    document.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      this.rageClicks.push({ x: e.clientX, y: e.clientY, ts: Date.now() });
      if (this.rageClicks.length > 100) this.rageClicks = this.rageClicks.slice(-100);
    }, { passive: true });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const recent = this.rageClicks.filter(c => c.ts > Date.now() - 3000);
    if (recent.length >= 5) {
      const clusters = this.detectClusters(recent);
      for (const cluster of clusters) {
        if (cluster.count >= 4) {
          findings.push(`Rage click detected: ${cluster.count} clicks at (${cluster.x}, ${cluster.y})`);
        }
      }
    }

    const disabledBtns = document.querySelectorAll("button[disabled]");
    if (disabledBtns.length > 10) {
      findings.push(`${disabledBtns.length} disabled buttons visible — possible confusion`);
    }

    const scrollableEls = document.querySelectorAll("[style*='overflow']");
    let nestedScrolls = 0;
    scrollableEls.forEach(el => {
      const parent = el.parentElement?.closest("[style*='overflow']");
      if (parent) nestedScrolls++;
    });
    if (nestedScrolls > 2) {
      findings.push(`${nestedScrolls} nested scroll containers — UX friction`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  private detectClusters(clicks: Array<{ x: number; y: number; ts: number }>): Array<{ x: number; y: number; count: number }> {
    const clusters: Array<{ x: number; y: number; count: number }> = [];
    const used = new Set<number>();
    for (let i = 0; i < clicks.length; i++) {
      if (used.has(i)) continue;
      let count = 1;
      for (let j = i + 1; j < clicks.length; j++) {
        if (used.has(j)) continue;
        const dx = clicks[i].x - clicks[j].x;
        const dy = clicks[i].y - clicks[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 30) {
          count++;
          used.add(j);
        }
      }
      if (count >= 3) {
        clusters.push({ x: Math.round(clicks[i].x), y: Math.round(clicks[i].y), count });
      }
    }
    return clusters;
  }
}
