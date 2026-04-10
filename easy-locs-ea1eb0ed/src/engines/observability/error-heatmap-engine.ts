import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface ErrorHotspot {
  route: string;
  errorCount: number;
  lastError: number;
  messages: string[];
}

export class ErrorHeatmapEngine extends BaseEngine {
  private hotspots: Map<string, ErrorHotspot> = new Map();

  constructor() {
    super({
      id: "obs-error-heatmap",
      name: "Error Heatmap Engine",
      category: "observability",
      intervalMs: 60_000,
    });
    window.addEventListener("error", (e) => {
      const route = window.location.pathname;
      const existing = this.hotspots.get(route) || { route, errorCount: 0, lastError: 0, messages: [] };
      existing.errorCount++;
      existing.lastError = Date.now();
      existing.messages.push((e.message || "unknown").substring(0, 80));
      if (existing.messages.length > 20) existing.messages = existing.messages.slice(-20);
      this.hotspots.set(route, existing);
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const sorted = [...this.hotspots.values()].sort((a, b) => b.errorCount - a.errorCount);
    const hot = sorted.filter(h => h.errorCount > 5 && h.lastError > Date.now() - 300_000);

    for (const h of hot.slice(0, 3)) {
      findings.push(`Error hotspot: "${h.route}" — ${h.errorCount} errors`);
    }

    if (this.hotspots.size > 200) {
      const recent = sorted.slice(0, 100);
      this.hotspots = new Map(recent.map(h => [h.route, h]));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getHotspots() {
    return [...this.hotspots.values()].sort((a, b) => b.errorCount - a.errorCount);
  }
}
