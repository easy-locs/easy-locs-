import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface OrbitFinding {
  type: "message_lag" | "thread_inconsistency" | "ui_jank" | "delivery_failure" | "entity_link_broken";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
}

export class OrbitQualityEngine extends BaseEngine {
  private findings: OrbitFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-orbit",
      name: "Orbit Quality Engine",
      category: "quality",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: OrbitFinding[] = [];

    const chatContainer = document.querySelector("[data-orbit-container], [data-chat-container]");
    if (chatContainer) {
      const messages = chatContainer.querySelectorAll("[data-message]");
      if (messages.length > 200) {
        findings.push({
          type: "ui_jank",
          severity: "medium",
          detail: `${messages.length} message DOM nodes rendered — may cause scroll jank`,
          recommendation: "Implement virtual scrolling for large conversations",
        });
      }

      const statusIcons = chatContainer.querySelectorAll("[data-status]");
      const statusCounts = new Map<string, number>();
      statusIcons.forEach(el => {
        const s = el.getAttribute("data-status") || "unknown";
        statusCounts.set(s, (statusCounts.get(s) || 0) + 1);
      });

      const pendingCount = statusCounts.get("pending") || 0;
      if (pendingCount > 5) {
        findings.push({
          type: "delivery_failure",
          severity: "high",
          detail: `${pendingCount} messages stuck in pending delivery status`,
          recommendation: "Check network connectivity and message delivery pipeline",
        });
      }
    }

    const orbitLinks = document.querySelectorAll("[data-entity-link]");
    orbitLinks.forEach(link => {
      const entityId = link.getAttribute("data-entity-id");
      const entityType = link.getAttribute("data-entity-type");
      if (entityId && !entityType) {
        findings.push({
          type: "entity_link_broken",
          severity: "medium",
          detail: `Entity link missing type for entity ${entityId}`,
          recommendation: "Add data-entity-type to ensure correct navigation",
        });
      }
    });

    const realtimeIndicator = document.querySelector("[data-realtime-status]");
    if (realtimeIndicator) {
      const status = realtimeIndicator.getAttribute("data-realtime-status");
      if (status === "disconnected" || status === "error") {
        findings.push({
          type: "message_lag",
          severity: "high",
          detail: `Realtime connection is ${status} — messages will not be delivered in real-time`,
          recommendation: "Check Supabase realtime connection and network",
        });
      }
    }

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
