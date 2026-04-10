import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class QueryOptimizer extends BaseEngine {
  private lastResourceCount = 0;

  constructor() {
    super({
      id: "perf-query",
      name: "Query Optimizer",
      category: "performance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const apiCalls = resources.filter(r => r.name.includes("/rest/v1/") && r.startTime > performance.now() - this.intervalMs);

    if (apiCalls.length > 30) {
      findings.push(`High API volume: ${apiCalls.length} calls in ${this.intervalMs / 1000}s`);
    }

    const slowCalls = apiCalls.filter(r => r.duration > 2000);
    if (slowCalls.length > 0) {
      const tables = slowCalls.map(r => {
        const match = r.name.match(/\/rest\/v1\/([^?]+)/);
        return match ? match[1] : "unknown";
      });
      findings.push(`${slowCalls.length} slow queries (>2s): ${[...new Set(tables)].join(", ")}`);
    }

    const parallelGroups = new Map<number, PerformanceResourceTiming[]>();
    for (const call of apiCalls) {
      const bucket = Math.floor(call.startTime / 100);
      if (!parallelGroups.has(bucket)) parallelGroups.set(bucket, []);
      parallelGroups.get(bucket)!.push(call);
    }
    for (const [, group] of parallelGroups) {
      if (group.length > 10) {
        findings.push(`Parallel query burst: ${group.length} concurrent API calls`);
        break;
      }
    }

    this.lastResourceCount = resources.length;

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
