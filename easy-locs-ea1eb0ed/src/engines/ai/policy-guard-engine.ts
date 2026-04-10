import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineOrchestrator } from "../core/engine-orchestrator";

export class PolicyGuardEngine extends BaseEngine {
  constructor() {
    super({
      id: "ai-policy-guard",
      name: "Policy Guard Engine",
      category: "ai",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const stats = engineOrchestrator.getAllStats();

    for (const engine of stats) {
      if (engine.errorCount > 20 && engine.running) {
        findings.push(`Engine "${engine.id}" has excessive errors (${engine.errorCount}) — consider disabling`);
      }

      if (engine.tickCount > 0 && engine.errorCount / engine.tickCount > 0.5) {
        findings.push(`Engine "${engine.id}" failing >50% of ticks — unstable`);
      }
    }

    const runningCount = stats.filter(s => s.running).length;
    const totalCount = stats.length;
    if (totalCount > 0 && runningCount / totalCount < 0.5) {
      findings.push(`Only ${runningCount}/${totalCount} engines running — system degraded`);
    }

    const totalUptime = stats.reduce((s, e) => s + e.uptime, 0);
    if (totalUptime === 0 && stats.length > 0) {
      findings.push("All engines report 0 uptime — possible boot failure");
    }

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions, duration: 0 };
  }
}
