import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface Incident {
  message: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  cluster: string;
}

export class IncidentClusteringEngine extends BaseEngine {
  private incidents: Map<string, Incident> = new Map();

  constructor() {
    super({
      id: "support-incident-clustering",
      name: "Incident Clustering Engine",
      category: "support",
      intervalMs: 120_000,
    });
    window.addEventListener("error", (e) => {
      const key = (e.message || "unknown").substring(0, 60);
      const cluster = this.classifyCluster(key);
      const existing = this.incidents.get(key);
      if (existing) {
        existing.count++;
        existing.lastSeen = Date.now();
      } else {
        this.incidents.set(key, { message: key, count: 1, firstSeen: Date.now(), lastSeen: Date.now(), cluster });
      }
    });
  }

  private classifyCluster(message: string): string {
    const lower = message.toLowerCase();
    if (lower.includes("network") || lower.includes("fetch")) return "network";
    if (lower.includes("auth") || lower.includes("permission")) return "auth";
    if (lower.includes("payment") || lower.includes("wallet")) return "financial";
    if (lower.includes("render") || lower.includes("react")) return "ui";
    return "general";
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const clusters = new Map<string, number>();
    for (const incident of this.incidents.values()) {
      if (incident.lastSeen > Date.now() - 600_000) {
        clusters.set(incident.cluster, (clusters.get(incident.cluster) || 0) + incident.count);
      }
    }

    for (const [cluster, count] of clusters) {
      if (count > 10) {
        findings.push(`Incident cluster "${cluster}": ${count} occurrences in 10min`);
      }
    }

    if (this.incidents.size > 500) {
      const sorted = [...this.incidents.entries()].sort((a, b) => b[1].lastSeen - a[1].lastSeen);
      this.incidents = new Map(sorted.slice(0, 300));
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
