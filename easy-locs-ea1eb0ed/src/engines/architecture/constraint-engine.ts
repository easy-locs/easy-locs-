import { BaseEngine, type EngineTickResult } from "../core/base-engine";

export class ConstraintEngine extends BaseEngine {
  private violations: Array<{ rule: string; detail: string; timestamp: number }> = [];

  constructor() {
    super({
      id: "arch-constraint",
      name: "Architecture Constraint Engine",
      category: "architecture",
      intervalMs: 120_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    const actions: string[] = [];

    const windowKeys = Object.keys(window).filter(k =>
      k.startsWith("__el_") || k.startsWith("__easy_")
    );
    if (windowKeys.length > 10) {
      findings.push(`Global namespace pollution: ${windowKeys.length} __el_ keys`);
    }

    const perfEntries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
    const directDbCalls = perfEntries.filter(e =>
      e.name.includes("supabase") && e.initiatorType === "fetch"
    );
    const recentDirectCalls = directDbCalls.filter(e => e.startTime > performance.now() - this.intervalMs);
    if (recentDirectCalls.length > 50) {
      findings.push(`High DB call volume: ${recentDirectCalls.length} direct Supabase calls in last cycle`);
    }

    const storeKeys = Object.keys(localStorage).filter(k => k.startsWith("el-"));
    const duplicatePatterns = new Map<string, number>();
    for (const key of storeKeys) {
      const base = key.replace(/-v\d+$/, "").replace(/-\d+$/, "");
      duplicatePatterns.set(base, (duplicatePatterns.get(base) || 0) + 1);
    }
    for (const [pattern, count] of duplicatePatterns) {
      if (count > 3) {
        findings.push(`Potential state duplication: "${pattern}" has ${count} variants in localStorage`);
      }
    }

    for (const f of findings) {
      this.violations.push({ rule: "constraint", detail: f, timestamp: Date.now() });
    }
    if (this.violations.length > 200) this.violations = this.violations.slice(-200);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions, duration: 0 };
  }

  getViolations() {
    return [...this.violations];
  }
}
