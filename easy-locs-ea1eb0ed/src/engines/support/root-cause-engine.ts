import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

export class RootCauseEngine extends BaseEngine {
  constructor() {
    super({
      id: "support-root-cause",
      name: "Root Cause Engine",
      category: "support",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const report = engineObserver.getReport();

    const highErrorEngines = report.engines.filter(e => e.errorCount > 5);
    for (const eng of highErrorEngines) {
      findings.push(`Engine "${eng.engineId}" has ${eng.errorCount} errors — investigate category "${eng.category}"`);
    }

    const highFindingEngines = report.engines.filter(e => e.totalFindings > 50);
    for (const eng of highFindingEngines) {
      findings.push(`Engine "${eng.engineId}" flagged ${eng.totalFindings} findings — systemic issue in "${eng.category}"`);
    }

    const recentErrors = report.recentErrors.filter(e => e.timestamp > Date.now() - 300_000);
    const errorCategories = new Map<string, number>();
    for (const err of recentErrors) {
      errorCategories.set(err.engineId, (errorCategories.get(err.engineId) || 0) + 1);
    }
    for (const [engineId, count] of errorCategories) {
      if (count > 3) {
        findings.push(`Root cause candidate: "${engineId}" failing repeatedly (${count}x in 5min)`);
      }
    }

    return { level: findings.length > 0 ? "propose" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
