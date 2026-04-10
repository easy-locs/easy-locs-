import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class NetworkAdaptationEngine extends BaseEngine {
  private qualityHistory: Array<{ effectiveType: string; downlink: number; rtt: number; ts: number }> = [];

  constructor() {
    super({
      id: "calls-network-adapt",
      name: "Network Adaptation Engine",
      category: "calls",
      intervalMs: 10_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const conn = (navigator as any).connection;
    if (conn) {
      const entry = {
        effectiveType: conn.effectiveType || "unknown",
        downlink: conn.downlink || 0,
        rtt: conn.rtt || 0,
        ts: Date.now(),
      };
      this.qualityHistory.push(entry);
      if (this.qualityHistory.length > 60) this.qualityHistory = this.qualityHistory.slice(-60);

      if (conn.effectiveType === "slow-2g" || conn.effectiveType === "2g") {
        findings.push(`Poor network: ${conn.effectiveType}, RTT: ${conn.rtt}ms`);
        this.emit("network-degraded", { type: conn.effectiveType, rtt: conn.rtt });
      }
      if (conn.rtt > 500) {
        findings.push(`High RTT: ${conn.rtt}ms`);
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
