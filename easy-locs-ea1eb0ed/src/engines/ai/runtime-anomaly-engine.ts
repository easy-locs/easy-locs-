import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface AnomalyBaseline {
  metric: string;
  mean: number;
  stdDev: number;
  samples: number[];
}

export class RuntimeAnomalyEngine extends BaseEngine {
  private baselines: Map<string, AnomalyBaseline> = new Map();

  constructor() {
    super({
      id: "ai-runtime-anomaly",
      name: "Runtime Anomaly Engine",
      category: "ai",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const metrics: Record<string, number> = {
      domNodes: document.querySelectorAll("*").length,
      heapMB: ((performance as any).memory?.usedJSHeapSize || 0) / 1048576,
      resourceCount: performance.getEntriesByType("resource").length,
      eventListeners: this.estimateEventListeners(),
    };

    for (const [name, value] of Object.entries(metrics)) {
      const baseline = this.baselines.get(name);
      if (baseline) {
        baseline.samples.push(value);
        if (baseline.samples.length > 30) baseline.samples = baseline.samples.slice(-30);

        baseline.mean = baseline.samples.reduce((s, v) => s + v, 0) / baseline.samples.length;
        const variance = baseline.samples.reduce((s, v) => s + (v - baseline.mean) ** 2, 0) / baseline.samples.length;
        baseline.stdDev = Math.sqrt(variance);

        if (baseline.stdDev > 0 && Math.abs(value - baseline.mean) > baseline.stdDev * 3) {
          findings.push(`Anomaly: ${name} = ${Math.round(value)} (baseline: ${Math.round(baseline.mean)} ± ${Math.round(baseline.stdDev)})`);
        }
      } else {
        this.baselines.set(name, { metric: name, mean: value, stdDev: 0, samples: [value] });
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  private estimateEventListeners(): number {
    let count = 0;
    const el = document.body;
    const walk = document.createTreeWalker(el, NodeFilter.SHOW_ELEMENT);
    let node = walk.nextNode();
    while (node && count < 1000) {
      count++;
      node = walk.nextNode();
    }
    return count;
  }
}
