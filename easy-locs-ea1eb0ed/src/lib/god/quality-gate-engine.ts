import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";
import { antiConflictEngine } from "./anti-conflict-engine";
import { stateMachineEngine } from "./state-machines";
import { continuousAuditEngine } from "./continuous-audit-engine";

export type GateVerdict = "PASS" | "PASS_WITH_WARNINGS" | "BLOCKED";

export type GateCheckpoint =
  | "build"
  | "deploy"
  | "migration"
  | "taxonomy_update"
  | "media_batch_import"
  | "listing_batch_import"
  | "search_index_publish"
  | "banner_campaign_publish"
  | "route_changes"
  | "schema_changes";

export interface GateCheckResult {
  checkpoint: GateCheckpoint;
  name: string;
  passed: boolean;
  blocking: boolean;
  message: string;
}

export interface QualityGateReport {
  timestamp: number;
  checkpoint: GateCheckpoint;
  verdict: GateVerdict;
  checks: GateCheckResult[];
  blocking_count: number;
  warning_count: number;
  overall_score: number;
  duration_ms: number;
}

class QualityGateEngine extends BaseEngine {
  private lastGateReport: QualityGateReport | null = null;
  private gateHistory: QualityGateReport[] = [];

  constructor() {
    super({
      id: "quality-gate-engine",
      name: "Quality Gate Engine",
      category: "god",
      intervalMs: 30 * 60 * 1000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const report = this.evaluate("build");

    return {
      level: report.verdict === "BLOCKED" ? "act" : report.verdict === "PASS_WITH_WARNINGS" ? "detect" : "observe",
      findings: report.blocking_count + report.warning_count,
      actions: report.verdict === "BLOCKED" ? [`Quality gate BLOCKED: ${report.blocking_count} blocking issues`] : [],
      duration: Math.round(performance.now() - start),
    };
  }

  evaluate(checkpoint: GateCheckpoint): QualityGateReport {
    const start = performance.now();
    const checks: GateCheckResult[] = [];

    checks.push(this.checkCriticalConflicts(checkpoint));
    checks.push(this.checkStateMachines(checkpoint));
    checks.push(this.checkAuditStatus(checkpoint));
    checks.push(this.checkEngineHeartbeats(checkpoint));
    checks.push(this.checkQualityScore(checkpoint));

    const blocking = checks.filter((c) => !c.passed && c.blocking);
    const warnings = checks.filter((c) => !c.passed && !c.blocking);
    const passedCount = checks.filter((c) => c.passed).length;
    const score = checks.length > 0 ? Math.round((passedCount / checks.length) * 100) : 100;

    let verdict: GateVerdict = "PASS";
    if (blocking.length > 0) verdict = "BLOCKED";
    else if (warnings.length > 0) verdict = "PASS_WITH_WARNINGS";

    const report: QualityGateReport = {
      timestamp: Date.now(),
      checkpoint,
      verdict,
      checks,
      blocking_count: blocking.length,
      warning_count: warnings.length,
      overall_score: score,
      duration_ms: Math.round(performance.now() - start),
    };

    this.lastGateReport = report;
    this.gateHistory.push(report);
    if (this.gateHistory.length > 50) {
      this.gateHistory = this.gateHistory.slice(-25);
    }

    return report;
  }

  private checkCriticalConflicts(cp: GateCheckpoint): GateCheckResult {
    const blocking = antiConflictEngine.getBlockingConflicts();
    return {
      checkpoint: cp,
      name: "No Critical Conflicts",
      passed: blocking.length === 0,
      blocking: true,
      message: blocking.length > 0
        ? `${blocking.length} critical conflicts detected`
        : "No critical conflicts",
    };
  }

  private checkStateMachines(cp: GateCheckpoint): GateCheckResult {
    const audits = stateMachineEngine.auditAll();
    const broken = audits.filter((a) => !a.valid);
    return {
      checkpoint: cp,
      name: "State Machines Valid",
      passed: broken.length === 0,
      blocking: true,
      message: broken.length > 0
        ? `${broken.length} broken state machines: ${broken.map((b) => b.machine).join(", ")}`
        : "All 8 state machines valid",
    };
  }

  private checkAuditStatus(cp: GateCheckpoint): GateCheckResult {
    const report = continuousAuditEngine.getLastReport();
    if (!report) {
      return {
        checkpoint: cp,
        name: "Audit Status",
        passed: true,
        blocking: false,
        message: "No audit report yet — first run pending",
      };
    }

    return {
      checkpoint: cp,
      name: "Audit Status",
      passed: report.overall_status !== "BLOCKED" && report.overall_status !== "CRITICAL",
      blocking: report.overall_status === "BLOCKED",
      message: `Audit: ${report.overall_status} (score: ${report.overall_score})`,
    };
  }

  private checkEngineHeartbeats(cp: GateCheckpoint): GateCheckResult {
    const engines = [
      { id: "anti-conflict", running: antiConflictEngine.isRunning },
      { id: "continuous-audit", running: continuousAuditEngine.isRunning },
    ];

    const notRunning = engines.filter((e) => !e.running);
    return {
      checkpoint: cp,
      name: "Engine Heartbeats",
      passed: notRunning.length === 0,
      blocking: false,
      message: notRunning.length > 0
        ? `${notRunning.length} engines not running: ${notRunning.map((e) => e.id).join(", ")}`
        : "All god engines running",
    };
  }

  private checkQualityScore(cp: GateCheckpoint): GateCheckResult {
    const report = continuousAuditEngine.getLastReport();
    const score = report?.overall_score ?? 100;
    return {
      checkpoint: cp,
      name: "Quality Score Above Threshold",
      passed: score >= 50,
      blocking: score < 30,
      message: `Quality score: ${score}/100`,
    };
  }

  getLastReport(): QualityGateReport | null {
    return this.lastGateReport;
  }

  getHistory(limit = 20): QualityGateReport[] {
    return this.gateHistory.slice(-limit);
  }

  canDeploy(): { allowed: boolean; verdict: GateVerdict; report: QualityGateReport } {
    const report = this.evaluate("deploy");
    return {
      allowed: report.verdict !== "BLOCKED",
      verdict: report.verdict,
      report,
    };
  }
}

export const qualityGateEngine = new QualityGateEngine();
