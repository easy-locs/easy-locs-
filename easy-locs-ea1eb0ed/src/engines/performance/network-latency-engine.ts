import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface LatencySnapshot {
  timestamp: number;
  avgMs: number;
  p95Ms: number;
  failRate: number;
  sampleCount: number;
}

export class NetworkLatencyEngine extends BaseEngine {
  private snapshots: LatencySnapshot[] = [];

  constructor() {
    super({
      id: "perf-network-latency",
      name: "Network Latency Engine",
      category: "performance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const recent = resources.filter(r =>
      r.startTime > performance.now() - this.intervalMs && r.name.includes("supabase")
    );

    if (recent.length === 0) {
      return { level: "observe", findings: 0, actions: [], duration: 0 };
    }

    const durations = recent.map(r => r.duration).sort((a, b) => a - b);
    const avg = durations.reduce((s, d) => s + d, 0) / durations.length;
    const p95 = durations[Math.floor(durations.length * 0.95)] || 0;
    const failed = recent.filter(r => r.responseStatus !== undefined && r.responseStatus >= 400);
    const failRate = failed.length / recent.length;

    const snapshot: LatencySnapshot = {
      timestamp: Date.now(),
      avgMs: Math.round(avg),
      p95Ms: Math.round(p95),
      failRate: Math.round(failRate * 100) / 100,
      sampleCount: recent.length,
    };
    this.snapshots.push(snapshot);
    if (this.snapshots.length > 120) this.snapshots = this.snapshots.slice(-120);

    if (avg > 1000) findings.push(`High avg latency: ${Math.round(avg)}ms`);
    if (p95 > 3000) findings.push(`P95 latency critical: ${Math.round(p95)}ms`);
    if (failRate > 0.1) findings.push(`API failure rate: ${Math.round(failRate * 100)}%`);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getSnapshots() {
    return [...this.snapshots];
  }
}
