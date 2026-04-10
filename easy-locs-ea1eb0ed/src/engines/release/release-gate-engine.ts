import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import { engineObserver } from "../core/engine-observer";

interface ReleaseGate {
  name: string;
  check: () => boolean;
  severity: "block" | "warn";
}

export class ReleaseGateEngine extends BaseEngine {
  private gates: ReleaseGate[] = [];
  private lastGateResult: { passed: number; failed: number; warnings: number } = { passed: 0, failed: 0, warnings: 0 };

  constructor() {
    super({
      id: "release-gate",
      name: "Release Gate Engine",
      category: "release",
      intervalMs: 120_000,
    });
    this.registerDefaultGates();
  }

  private registerDefaultGates(): void {
    this.gates.push({
      name: "error-rate",
      severity: "block",
      check: () => {
        const report = engineObserver.getReport();
        return report.totalTicks > 0 ? (report.totalErrors / report.totalTicks) < 0.05 : true;
      },
    });
    this.gates.push({
      name: "memory-health",
      severity: "warn",
      check: () => {
        const mem = (performance as any).memory;
        if (!mem) return true;
        return mem.usedJSHeapSize / mem.jsHeapSizeLimit < 0.8;
      },
    });
    this.gates.push({
      name: "dom-size",
      severity: "warn",
      check: () => document.querySelectorAll("*").length < 8000,
    });
    this.gates.push({
      name: "console-errors",
      severity: "block",
      check: () => {
        const errorLog = (window as any).__el_error_log;
        return !errorLog || errorLog.length < 50;
      },
    });
  }

  async tick(): Promise<EngineTickResult> {
    const findings: string[] = [];
    let passed = 0, failed = 0, warnings = 0;

    for (const gate of this.gates) {
      try {
        const result = gate.check();
        if (result) {
          passed++;
        } else if (gate.severity === "block") {
          failed++;
          findings.push(`GATE BLOCKED: ${gate.name}`);
        } else {
          warnings++;
          findings.push(`GATE WARNING: ${gate.name}`);
        }
      } catch {
        warnings++;
      }
    }

    this.lastGateResult = { passed, failed, warnings };

    return { level: failed > 0 ? "propose" : findings.length > 0 ? "detect" : "observe", findings: findings.length, actions: [], duration: 0 };
  }

  getGateStatus() {
    return { ...this.lastGateResult, total: this.gates.length };
  }
}
