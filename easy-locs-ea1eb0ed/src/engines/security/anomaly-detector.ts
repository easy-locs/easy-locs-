import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface AnomalyRecord {
  type: string;
  severity: "low" | "medium" | "high";
  detail: string;
  timestamp: number;
}

export class AnomalyDetector extends BaseEngine {
  static readonly RUNTIME_CLASS = "browser-monitor";
  static readonly BACKEND_WORKER = "fraud-anomaly-scan";

  private anomalies: AnomalyRecord[] = [];
  private clickHistory: number[] = [];

  constructor() {
    super({
      id: "sec-anomaly",
      name: "Anomaly Detector (Monitor)",
      category: "security",
      intervalMs: 15_000,
    });
    document.addEventListener("click", () => {
      this.clickHistory.push(Date.now());
      if (this.clickHistory.length > 200) this.clickHistory = this.clickHistory.slice(-200);
    }, { passive: true });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const recentClicks = this.clickHistory.filter(t => t > Date.now() - 5000);
    if (recentClicks.length > 30) {
      findings.push(`Click storm: ${recentClicks.length} clicks in 5s — bot behavior`);
      this.anomalies.push({ type: "click-storm", severity: "high", detail: `${recentClicks.length} clicks/5s`, timestamp: Date.now() });
    }

    const resources = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const recentFetches = resources.filter(r =>
      r.startTime > performance.now() - 5000 && r.name.includes("/rest/v1/")
    );
    if (recentFetches.length > 50) {
      findings.push(`API burst: ${recentFetches.length} requests in 5s`);
      this.anomalies.push({ type: "api-burst", severity: "medium", detail: `${recentFetches.length} reqs/5s`, timestamp: Date.now() });
    }

    if (this.anomalies.length > 300) this.anomalies = this.anomalies.slice(-300);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getAnomalies() {
    return [...this.anomalies];
  }
}
