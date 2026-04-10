import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { db } from "@/services/db";

interface AutomationFinding {
  type: "overdue_reminder" | "stale_booking" | "expired_document" | "pending_review" | "inactive_merchant";
  severity: "low" | "medium" | "high";
  detail: string;
  recommendation: string;
  count?: number;
}

export class AutomationEngine extends BaseEngine {
  private findings: AutomationFinding[] = [];
  private score = 100;

  constructor() {
    super({
      id: "quality-automation",
      name: "Automation Engine",
      category: "quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: AutomationFinding[] = [];
    const now = new Date();

    try {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000).toISOString();
      const { data: inactiveShops, count } = await db("storefront_pages")
        .select("id", { count: "exact" })
        .lt("updated_at", thirtyDaysAgo)
        .eq("status", "active")
        .limit(1);

      if (count && count > 0) {
        findings.push({
          type: "inactive_merchant",
          severity: "medium",
          detail: `${count} active merchants haven't updated their profile in 30+ days`,
          recommendation: "Send automated reminder to update menu/catalog/hours",
          count,
        });
      }
    } catch {}

    try {
      const { data: pendingOrders, count } = await db("orders")
        .select("id", { count: "exact" })
        .eq("status", "pending")
        .limit(1);

      if (count && count > 5) {
        findings.push({
          type: "pending_review",
          severity: "high",
          detail: `${count} orders stuck in pending status`,
          recommendation: "Auto-escalate or notify merchants about pending orders",
          count,
        });
      }
    } catch {}

    try {
      const oneWeekAgo = new Date(now.getTime() - 7 * 86400000).toISOString();
      const { data: staleBookings, count } = await db("bookings")
        .select("id", { count: "exact" })
        .eq("status", "pending")
        .lt("created_at", oneWeekAgo)
        .limit(1);

      if (count && count > 0) {
        findings.push({
          type: "stale_booking",
          severity: "medium",
          detail: `${count} bookings pending for over 7 days`,
          recommendation: "Auto-cancel or send reminder for stale bookings",
          count,
        });
      }
    } catch {}

    this.findings = findings;
    this.score = Math.max(0, 100 - findings.filter(f => f.severity === "high").length * 20 - findings.filter(f => f.severity === "medium").length * 8);

    this.emit("report", { score: this.score, totalFindings: findings.length });
    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getFindings() { return [...this.findings]; }
  getScore() { return this.score; }
  getReport() { return { score: this.score, findings: this.findings }; }
}
