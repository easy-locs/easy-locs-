import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class CachePolicyEngine extends BaseEngine {
  constructor() {
    super({
      id: "perf-cache-policy",
      name: "Cache Policy Engine",
      category: "performance",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    let totalCacheSize = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          if (val) totalCacheSize += val.length;
        }
      }
    } catch {}

    if (totalCacheSize > 3 * 1024 * 1024) {
      findings.push(`localStorage usage: ${(totalCacheSize / 1048576).toFixed(1)}MB — approaching limit`);

      const entries: Array<{ key: string; size: number }> = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          entries.push({ key, size: val?.length || 0 });
        }
      }
      entries.sort((a, b) => b.size - a.size);

      const topKeys = entries.slice(0, 5).map(e => `${e.key} (${(e.size / 1024).toFixed(0)}KB)`);
      findings.push(`Top consumers: ${topKeys.join(", ")}`);
    }

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const uncachedCount = resources.filter(r =>
      r.transferSize > 0 && r.transferSize === r.encodedBodySize && r.name.includes("/rest/v1/")
    ).length;
    if (uncachedCount > 20) {
      findings.push(`${uncachedCount} uncached API responses — consider caching strategy`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
