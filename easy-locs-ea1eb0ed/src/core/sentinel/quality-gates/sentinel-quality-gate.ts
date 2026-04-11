import type { SentinelVerdict, SentinelSeverity } from "../types";
import { sentinelConflictEngine } from "../conflict/sentinel-conflict-engine";
import { sentinelInvariantEngine } from "../invariants/invariant-engine";
import { sentinelHealthEngine } from "../health/sentinel-health-engine";

type GateCheckpoint = "build" | "deploy" | "migration" | "import" | "taxonomy_publish" | "media_publish" | "banner_publish" | "route_change" | "schema_change";

interface GateResult {
  checkpoint: GateCheckpoint;
  verdict: SentinelVerdict;
  blocking_reasons: string[];
  warnings: string[];
  score: number;
  checked_at: number;
}

interface GateCheck {
  name: string;
  severity: SentinelSeverity;
  check: () => { passed: boolean; message: string };
}

class SentinelQualityGate {
  private checks: GateCheck[] = [];
  private history: GateResult[] = [];
  private readonly MAX_HISTORY = 100;

  constructor() {
    this.registerBuiltinChecks();
  }

  private registerBuiltinChecks(): void {
    this.checks = [
      {
        name: "No critical conflicts open",
        severity: "critical",
        check: () => {
          const critical = sentinelConflictEngine.getCritical();
          return { passed: critical.length === 0, message: critical.length === 0 ? "No critical conflicts" : `${critical.length} critical conflict(s) open` };
        },
      },
      {
        name: "No critical invariant broken",
        severity: "critical",
        check: () => {
          const result = sentinelInvariantEngine.checkBlocking();
          return { passed: result.passed, message: result.passed ? "All blocking invariants pass" : `${result.failures.length} blocking invariant(s) failed` };
        },
      },
      {
        name: "No critical engine without heartbeat",
        severity: "critical",
        check: () => {
          const stale = sentinelHealthEngine.checkStaleHeartbeats();
          return { passed: stale.length === 0, message: stale.length === 0 ? "All engines have heartbeat" : `${stale.length} engine(s) with stale heartbeat` };
        },
      },
      {
        name: "System health is not unhealthy",
        severity: "critical",
        check: () => {
          const status = sentinelHealthEngine.getGlobalStatus();
          return { passed: status !== "unhealthy", message: `Global status: ${status}` };
        },
      },
      {
        name: "Conflict score acceptable",
        severity: "high",
        check: () => {
          const score = sentinelConflictEngine.getScore();
          return { passed: score >= 50, message: `Conflict score: ${score}` };
        },
      },
    ];
  }

  registerCheck(check: GateCheck): void {
    this.checks.push(check);
  }

  evaluate(checkpoint: GateCheckpoint): GateResult {
    const blockingReasons: string[] = [];
    const warnings: string[] = [];
    let totalScore = 0;
    let checksRun = 0;

    for (const check of this.checks) {
      try {
        const result = check.check();
        checksRun++;
        totalScore += result.passed ? 100 : 0;

        if (!result.passed) {
          if (check.severity === "critical") {
            blockingReasons.push(`[${check.name}] ${result.message}`);
          } else {
            warnings.push(`[${check.name}] ${result.message}`);
          }
        }
      } catch (err) {
        blockingReasons.push(`[${check.name}] Check crashed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const score = checksRun > 0 ? Math.round(totalScore / checksRun) : 0;
    let verdict: SentinelVerdict;
    if (blockingReasons.length > 0) {
      verdict = "BLOCKED";
    } else if (warnings.length > 0) {
      verdict = "PASS_WITH_WARNINGS";
    } else {
      verdict = "PASS";
    }

    const result: GateResult = {
      checkpoint,
      verdict,
      blocking_reasons: blockingReasons,
      warnings,
      score,
      checked_at: Date.now(),
    };

    this.history.push(result);
    if (this.history.length > this.MAX_HISTORY) {
      this.history.splice(0, this.history.length - this.MAX_HISTORY);
    }

    return result;
  }

  getLastResult(): GateResult | null {
    return this.history.length > 0 ? this.history[this.history.length - 1] : null;
  }

  getHistory(limit = 20): GateResult[] {
    return this.history.slice(-limit);
  }

  isReleaseReady(): boolean {
    const last = this.getLastResult();
    return last ? last.verdict !== "BLOCKED" : true;
  }
}

export const sentinelQualityGate = new SentinelQualityGate();
