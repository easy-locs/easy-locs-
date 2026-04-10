import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class DuplicationDetector extends BaseEngine {
  private duplications: Array<{ type: string; detail: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "cq-duplication",
      name: "Duplication Detector",
      category: "code-quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const perfEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const urlCounts = new Map<string, number>();
    const recentEntries = perfEntries.filter(e => e.startTime > performance.now() - this.intervalMs);
    for (const entry of recentEntries) {
      const url = entry.name.split("?")[0];
      urlCounts.set(url, (urlCounts.get(url) || 0) + 1);
    }
    for (const [url, count] of urlCounts) {
      if (count > 5 && url.includes("/rest/v1/")) {
        const table = url.split("/rest/v1/")[1]?.split("?")[0] || url;
        findings.push(`Duplicate API call: "${table}" fetched ${count}x in last cycle`);
        this.duplications.push({ type: "api-duplication", detail: `${table} x${count}`, timestamp: Date.now() });
      }
    }

    const storageKeys = Object.keys(localStorage);
    const prefixMap = new Map<string, string[]>();
    for (const key of storageKeys) {
      const prefix = key.split("-").slice(0, 2).join("-");
      if (!prefixMap.has(prefix)) prefixMap.set(prefix, []);
      prefixMap.get(prefix)!.push(key);
    }
    for (const [prefix, keys] of prefixMap) {
      if (keys.length > 5) {
        findings.push(`Storage key sprawl: "${prefix}" has ${keys.length} entries`);
      }
    }

    if (this.duplications.length > 300) this.duplications = this.duplications.slice(-300);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
