import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { platformBus } from "@/lib/shared/platform-bus";

export class PlatformBusEnforcer extends BaseEngine {
  private lastEventCount = 0;

  constructor() {
    super({
      id: "arch-platformbus",
      name: "PlatformBus Enforcer",
      category: "architecture",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const eventLog = (platformBus as any).log as Array<{ type: string; ts: number }> | undefined;
    if (!eventLog || !Array.isArray(eventLog)) {
      return { level: "observe", findings: 0, actions: [], duration: 0 };
    }

    const currentCount = eventLog.length;
    const newEvents = currentCount - this.lastEventCount;
    this.lastEventCount = currentCount;

    if (newEvents > 200) {
      findings.push(`Event storm: ${newEvents} events in ${this.intervalMs / 1000}s — possible loop`);
    }

    const recentEvents = eventLog.slice(-100);
    const typeCounts = new Map<string, number>();
    for (const evt of recentEvents) {
      typeCounts.set(evt.type, (typeCounts.get(evt.type) || 0) + 1);
    }
    for (const [type, count] of typeCounts) {
      if (count > 30) {
        findings.push(`Event flood: "${type}" emitted ${count} times in recent window`);
      }
    }

    const orphanTypes = new Set<string>();
    for (const evt of recentEvents) {
      if (evt.type.includes("undefined") || evt.type.includes("null")) {
        orphanTypes.add(evt.type);
      }
    }
    if (orphanTypes.size > 0) {
      findings.push(`Malformed events detected: ${[...orphanTypes].join(", ")}`);
    }

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
