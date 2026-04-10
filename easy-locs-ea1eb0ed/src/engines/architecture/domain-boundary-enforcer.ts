import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class DomainBoundaryEnforcer extends BaseEngine {
  private crossings: Array<{ from: string; to: string; event: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "arch-domain-boundary",
      name: "Domain Boundary Enforcer",
      category: "architecture",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const eventLog = (platformBus as any).log as Array<{ type: string; source?: string }> | undefined;
    if (eventLog && Array.isArray(eventLog)) {
      const recentEvents = eventLog.slice(-100);
      for (const evt of recentEvents) {
        if (!evt.source || !evt.type) continue;
        const sourceDomain = evt.source.split(".")[0].split(":")[0];
        const eventDomain = evt.type.split(".")[0].split(":")[0];

        const allowed = new Set([
          "system", "platform", "engine", "orchestration", "notification", "analytics",
        ]);
        if (sourceDomain !== eventDomain && !allowed.has(sourceDomain) && !allowed.has(eventDomain)) {
          this.crossings.push({
            from: sourceDomain,
            to: eventDomain,
            event: evt.type,
            timestamp: Date.now(),
          });
        }
      }
    }

    const recentCrossings = this.crossings.filter(c => c.timestamp > Date.now() - this.intervalMs);
    if (recentCrossings.length > 10) {
      findings.push(`${recentCrossings.length} cross-domain event flows detected in last cycle`);
    }

    if (this.crossings.length > 500) this.crossings = this.crossings.slice(-500);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
