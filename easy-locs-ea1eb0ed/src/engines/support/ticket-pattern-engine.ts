import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class TicketPatternEngine extends BaseEngine {
  private tickets: Array<{ type: string; category: string; ts: number }> = [];

  constructor() {
    super({
      id: "support-ticket-pattern",
      name: "Ticket Pattern Engine",
      category: "support",
      intervalMs: 60_000,
    });
    platformBus.on("support:ticket_created" as any, (p: any) => {
      this.tickets.push({ type: p?.type || "unknown", category: p?.category || "general", ts: Date.now() });
      if (this.tickets.length > 500) this.tickets = this.tickets.slice(-500);
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const recent = this.tickets.filter(t => t.ts > Date.now() - 3600_000);
    if (recent.length > 10) {
      findings.push(`Ticket surge: ${recent.length} in last hour`);
    }

    const categories = new Map<string, number>();
    for (const t of recent) {
      categories.set(t.category, (categories.get(t.category) || 0) + 1);
    }
    for (const [cat, count] of categories) {
      if (count > 5) {
        findings.push(`Trending issue: "${cat}" has ${count} tickets in last hour`);
      }
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
