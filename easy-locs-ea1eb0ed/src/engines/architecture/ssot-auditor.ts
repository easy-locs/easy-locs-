import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface SSOTViolation {
  domain: string;
  issue: string;
  severity: "low" | "medium" | "high";
  timestamp: number;
}

export class SSOTAuditor extends BaseEngine {
  private violations: SSOTViolation[] = [];

  constructor() {
    super({
      id: "arch-ssot-auditor",
      name: "SSOT Auditor",
      category: "architecture",
      intervalMs: 180_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const storeModules = ["wallet", "orbit", "radar", "dashboard", "auth", "storefront"];
    for (const mod of storeModules) {
      const keys = Object.keys(sessionStorage).filter(k => k.includes(mod));
      const localKeys = Object.keys(localStorage).filter(k => k.includes(mod));
      if (keys.length > 0 && localKeys.length > 0) {
        findings.push(`${mod}: data in both sessionStorage (${keys.length}) and localStorage (${localKeys.length}) — potential SSOT split`);
        this.violations.push({
          domain: mod,
          issue: "Dual storage detected",
          severity: "medium",
          timestamp: Date.now(),
        });
      }
    }

    const perfEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const apiCalls = perfEntries.filter(e => e.name.includes("/rest/v1/"));
    const tableCallMap = new Map<string, number>();
    for (const call of apiCalls) {
      const match = call.name.match(/\/rest\/v1\/([^?&]+)/);
      if (match) {
        tableCallMap.set(match[1], (tableCallMap.get(match[1]) || 0) + 1);
      }
    }
    for (const [table, count] of tableCallMap) {
      if (count > 20) {
        findings.push(`Table "${table}" queried ${count} times — consider single-source caching`);
      }
    }

    if (this.violations.length > 200) this.violations = this.violations.slice(-200);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }
}
