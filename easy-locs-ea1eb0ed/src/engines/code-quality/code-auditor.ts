import { BaseEngine, type EngineTickResult } from "../core/base-engine";

interface CodeIssue {
  type: string;
  detail: string;
  severity: "info" | "low" | "medium" | "high";
  timestamp: number;
}

export class CodeAuditor extends BaseEngine {
  private issues: CodeIssue[] = [];

  constructor() {
    super({
      id: "cq-auditor",
      name: "Code Auditor",
      category: "code-quality",
      intervalMs: 300_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];

    const errors = (window as any).__el_error_log as Array<{ message: string; stack?: string }> | undefined;
    if (errors && errors.length > 0) {
      const patterns = new Map<string, number>();
      for (const err of errors) {
        const key = err.message?.substring(0, 80) || "unknown";
        patterns.set(key, (patterns.get(key) || 0) + 1);
      }
      for (const [pattern, count] of patterns) {
        if (count >= 3) {
          findings.push(`Recurring error (${count}x): ${pattern}`);
          this.issues.push({ type: "recurring-error", detail: pattern, severity: "high", timestamp: Date.now() });
        }
      }
    }

    const warnCount = (window as any).__el_warn_count || 0;
    if (warnCount > 100) {
      findings.push(`High warning volume: ${warnCount} console warnings accumulated`);
      this.issues.push({ type: "warn-flood", detail: `${warnCount} warnings`, severity: "medium", timestamp: Date.now() });
    }

    const perfEntries = performance.getEntriesByType("measure");
    const slowMeasures = perfEntries.filter((e: any) => e.duration > 500);
    if (slowMeasures.length > 5) {
      findings.push(`${slowMeasures.length} slow operations (>500ms) detected`);
    }

    if (this.issues.length > 500) this.issues = this.issues.slice(-500);

    return { level: findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getIssues() {
    return [...this.issues];
  }
}
