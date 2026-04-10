import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

interface BusinessMetric {
  event: string;
  count: number;
  lastSeen: number;
}

export class BusinessEventsEngine extends BaseEngine {
  private metrics: Map<string, BusinessMetric> = new Map();

  constructor() {
    super({
      id: "obs-business-events",
      name: "Business Events Engine",
      category: "observability",
      intervalMs: 60_000,
    });
    const businessPrefixes = ["order", "booking", "payment", "wallet", "delivery", "storefront"];
    for (const prefix of businessPrefixes) {
      platformBus.onPrefix(prefix, (type: string) => {
        const existing = this.metrics.get(type) || { event: type, count: 0, lastSeen: 0 };
        existing.count++;
        existing.lastSeen = Date.now();
        this.metrics.set(type, existing);
      });
    }
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const highVolume = [...this.metrics.values()].filter(m => m.count > 100 && m.lastSeen > Date.now() - 300_000);
    for (const m of highVolume) {
      findings.push(`High-volume business event: "${m.event}" (${m.count} total)`);
    }

    const stale = [...this.metrics.entries()].filter(([, m]) => m.lastSeen < Date.now() - 3600_000);
    for (const [key] of stale) {
      this.metrics.delete(key);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getMetrics() {
    return [...this.metrics.values()];
  }
}
