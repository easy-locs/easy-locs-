import { BaseEngine, type EngineTickResult } from "@/engines/core/base-engine";
import { antiConflictEngine } from "./anti-conflict-engine";
import { stateMachineEngine } from "./state-machines";
import { taxonomyGodEngine } from "./taxonomy-god-engine";
import { contentGraph } from "./canonical-content-graph";

export type AuditFrequency =
  | "1min"
  | "3min"
  | "5min"
  | "10min"
  | "15min"
  | "20min"
  | "30min"
  | "1hour"
  | "2hour"
  | "6hour"
  | "12hour"
  | "24hour"
  | "on_deploy"
  | "on_schema_change"
  | "on_migration"
  | "on_taxonomy_update";

export type AuditStatus =
  | "HEALTHY"
  | "DEGRADED"
  | "WARNING"
  | "CRITICAL"
  | "BLOCKED"
  | "SELF_HEALING"
  | "VERIFIED";

export interface AuditCheckResult {
  check_id: string;
  check_name: string;
  frequency: AuditFrequency;
  status: AuditStatus;
  score: number;
  errors: string[];
  warnings: string[];
  auto_fixes: string[];
  duration_ms: number;
  last_run: number;
}

export interface AuditReport {
  timestamp: number;
  overall_status: AuditStatus;
  overall_score: number;
  checks: AuditCheckResult[];
  total_errors: number;
  total_warnings: number;
  total_auto_fixes: number;
  blocking: boolean;
}

interface AuditCheck {
  id: string;
  name: string;
  frequency: AuditFrequency;
  frequency_ms: number;
  last_run: number;
  execute: () => AuditCheckResult;
}

const FREQUENCY_MS: Record<AuditFrequency, number> = {
  "1min": 60_000,
  "3min": 180_000,
  "5min": 300_000,
  "10min": 600_000,
  "15min": 900_000,
  "20min": 1_200_000,
  "30min": 1_800_000,
  "1hour": 3_600_000,
  "2hour": 7_200_000,
  "6hour": 21_600_000,
  "12hour": 43_200_000,
  "24hour": 86_400_000,
  "on_deploy": 0,
  "on_schema_change": 0,
  "on_migration": 0,
  "on_taxonomy_update": 0,
};

class ContinuousAuditEngine extends BaseEngine {
  private checks: AuditCheck[] = [];
  private lastReport: AuditReport | null = null;
  private reportHistory: AuditReport[] = [];

  constructor() {
    super({
      id: "continuous-audit-engine",
      name: "Continuous Audit Engine",
      category: "god",
      intervalMs: 60_000,
    });
    this.registerBuiltinChecks();
  }

  async tick(): Promise<EngineTickResult> {
    const start = performance.now();
    const now = Date.now();
    const results: AuditCheckResult[] = [];
    const actions: string[] = [];

    for (const check of this.checks) {
      if (check.frequency_ms === 0) continue;
      if (now - check.last_run < check.frequency_ms) continue;

      const result = check.execute();
      check.last_run = now;
      results.push(result);

      if (result.status === "CRITICAL" || result.status === "BLOCKED") {
        actions.push(`${check.name}: ${result.status} (${result.errors.length} errors)`);
      }
      if (result.auto_fixes.length > 0) {
        actions.push(`${check.name}: ${result.auto_fixes.length} auto-fixes applied`);
      }
    }

    if (results.length > 0) {
      this.lastReport = this.buildReport(results);
      this.reportHistory.push(this.lastReport);
      if (this.reportHistory.length > 100) {
        this.reportHistory = this.reportHistory.slice(-50);
      }
    }

    return {
      level: actions.length > 0 ? "detect" : "observe",
      findings: results.reduce((sum, r) => sum + r.errors.length + r.warnings.length, 0),
      actions,
      duration: Math.round(performance.now() - start),
    };
  }

  private registerBuiltinChecks(): void {
    this.checks.push({
      id: "health_ping",
      name: "Critical Health Ping",
      frequency: "1min",
      frequency_ms: FREQUENCY_MS["1min"],
      last_run: 0,
      execute: () => this.checkHealthPing(),
    });

    this.checks.push({
      id: "engine_heartbeat",
      name: "Engine Heartbeat Audit",
      frequency: "3min",
      frequency_ms: FREQUENCY_MS["3min"],
      last_run: 0,
      execute: () => this.checkEngineHeartbeat(),
    });

    this.checks.push({
      id: "conflict_audit",
      name: "Conflict Audit",
      frequency: "5min",
      frequency_ms: FREQUENCY_MS["5min"],
      last_run: 0,
      execute: () => this.checkConflicts(),
    });

    this.checks.push({
      id: "taxonomy_audit",
      name: "Taxonomy Integrity Audit",
      frequency: "15min",
      frequency_ms: FREQUENCY_MS["15min"],
      last_run: 0,
      execute: () => this.checkTaxonomy(),
    });

    this.checks.push({
      id: "state_machine_audit",
      name: "State Machine Consistency Audit",
      frequency: "20min",
      frequency_ms: FREQUENCY_MS["20min"],
      last_run: 0,
      execute: () => this.checkStateMachines(),
    });

    this.checks.push({
      id: "data_integrity_audit",
      name: "Data Integrity Audit",
      frequency: "10min",
      frequency_ms: FREQUENCY_MS["10min"],
      last_run: 0,
      execute: () => this.checkDataIntegrity(),
    });

    this.checks.push({
      id: "graph_audit",
      name: "Content Graph Audit",
      frequency: "15min",
      frequency_ms: FREQUENCY_MS["15min"],
      last_run: 0,
      execute: () => this.checkContentGraph(),
    });
  }

  private checkHealthPing(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const engines = [
      { id: "anti-conflict-engine", engine: antiConflictEngine },
    ];

    for (const { id, engine } of engines) {
      if (!engine.isRunning) {
        warnings.push(`Engine ${id} is not running`);
      }
    }

    return {
      check_id: "health_ping",
      check_name: "Critical Health Ping",
      frequency: "1min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
      errors,
      warnings,
      auto_fixes: [],
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkEngineHeartbeat(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const stats = antiConflictEngine.stats;
    if (stats.running && stats.tickCount === 0 && stats.uptime > 60_000) {
      warnings.push("Anti-conflict engine running but zero ticks after 60s");
    }

    return {
      check_id: "engine_heartbeat",
      check_name: "Engine Heartbeat Audit",
      frequency: "3min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
      errors,
      warnings,
      auto_fixes: [],
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkConflicts(): AuditCheckResult {
    const start = performance.now();
    const scan = antiConflictEngine.runFullScan();
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const c of scan.conflicts) {
      if (c.severity === "critical") errors.push(c.description);
      else if (c.severity === "high") warnings.push(c.description);
    }

    return {
      check_id: "conflict_audit",
      check_name: "Conflict Audit",
      frequency: "5min",
      status: scan.blocking_conflicts > 0 ? "BLOCKED" : errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - scan.severity_score),
      errors,
      warnings,
      auto_fixes: scan.conflicts.filter((c) => c.auto_fixable).map((c) => c.suggested_fix || c.description),
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkTaxonomy(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];
    const autoFixes: string[] = [];

    const stats = taxonomyGodEngine.getStats();

    if (stats.conflictCount > 0) {
      const conflicts = taxonomyGodEngine.detectConflicts();
      for (const c of conflicts) {
        if (c.severity === "critical" || c.severity === "high") {
          errors.push(c.description);
        } else {
          warnings.push(c.description);
        }
        if (c.auto_fixable && c.suggested_fix) {
          autoFixes.push(c.suggested_fix);
        }
      }
    }

    if (stats.totalNodes < 10) {
      warnings.push(`Taxonomy has very few nodes: ${stats.totalNodes}`);
    }

    return {
      check_id: "taxonomy_audit",
      check_name: "Taxonomy Integrity Audit",
      frequency: "15min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 15 - warnings.length * 5),
      errors,
      warnings,
      auto_fixes: autoFixes,
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkStateMachines(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const audits = stateMachineEngine.auditAll();
    for (const audit of audits) {
      if (!audit.valid) {
        for (const issue of audit.issues) {
          errors.push(`[${audit.machine}] ${issue}`);
        }
      }
      if (audit.unreachableStates.length > 0) {
        warnings.push(`[${audit.machine}] Unreachable states: ${audit.unreachableStates.join(", ")}`);
      }
    }

    return {
      check_id: "state_machine_audit",
      check_name: "State Machine Consistency Audit",
      frequency: "20min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 20 - warnings.length * 5),
      errors,
      warnings,
      auto_fixes: [],
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkDataIntegrity(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const graphStats = contentGraph.getStats();
    if (graphStats.brokenEdgeCount > 0) {
      errors.push(`${graphStats.brokenEdgeCount} broken edges in content graph`);
    }
    if (graphStats.orphanCount > 5) {
      warnings.push(`${graphStats.orphanCount} orphan nodes in content graph`);
    }

    return {
      check_id: "data_integrity_audit",
      check_name: "Data Integrity Audit",
      frequency: "10min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "WARNING" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 15 - warnings.length * 3),
      errors,
      warnings,
      auto_fixes: [],
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  private checkContentGraph(): AuditCheckResult {
    const start = performance.now();
    const errors: string[] = [];
    const warnings: string[] = [];

    const stats = contentGraph.getStats();

    if (stats.totalNodes === 0) {
      warnings.push("Content graph is empty — no nodes registered");
    }

    if (stats.brokenEdgeCount > 0) {
      errors.push(`${stats.brokenEdgeCount} broken edges detected`);
    }

    const typeEntries = Object.entries(stats.nodesByType);
    for (const [type, count] of typeEntries) {
      if (count === 0) {
        warnings.push(`Node type ${type} has 0 instances`);
      }
    }

    return {
      check_id: "graph_audit",
      check_name: "Content Graph Audit",
      frequency: "15min",
      status: errors.length > 0 ? "CRITICAL" : warnings.length > 0 ? "DEGRADED" : "HEALTHY",
      score: Math.max(0, 100 - errors.length * 15 - warnings.length * 3),
      errors,
      warnings,
      auto_fixes: [],
      duration_ms: Math.round(performance.now() - start),
      last_run: Date.now(),
    };
  }

  runManualCheck(checkId: string): AuditCheckResult | null {
    const check = this.checks.find((c) => c.id === checkId);
    if (!check) return null;
    const result = check.execute();
    check.last_run = Date.now();
    return result;
  }

  runAllChecks(): AuditReport {
    const results: AuditCheckResult[] = [];
    for (const check of this.checks) {
      results.push(check.execute());
      check.last_run = Date.now();
    }
    this.lastReport = this.buildReport(results);
    this.reportHistory.push(this.lastReport);
    return this.lastReport;
  }

  triggerEventAudit(event: "on_deploy" | "on_schema_change" | "on_migration" | "on_taxonomy_update"): AuditReport {
    this.log("info", `Triggered event audit: ${event}`);
    return this.runAllChecks();
  }

  private buildReport(checks: AuditCheckResult[]): AuditReport {
    const totalErrors = checks.reduce((s, c) => s + c.errors.length, 0);
    const totalWarnings = checks.reduce((s, c) => s + c.warnings.length, 0);
    const totalAutoFixes = checks.reduce((s, c) => s + c.auto_fixes.length, 0);
    const avgScore = checks.length > 0 ? Math.round(checks.reduce((s, c) => s + c.score, 0) / checks.length) : 100;
    const hasBlocked = checks.some((c) => c.status === "BLOCKED");
    const hasCritical = checks.some((c) => c.status === "CRITICAL");

    let overall_status: AuditStatus = "HEALTHY";
    if (hasBlocked) overall_status = "BLOCKED";
    else if (hasCritical) overall_status = "CRITICAL";
    else if (totalErrors > 0) overall_status = "WARNING";
    else if (totalWarnings > 3) overall_status = "DEGRADED";

    return {
      timestamp: Date.now(),
      overall_status,
      overall_score: avgScore,
      checks,
      total_errors: totalErrors,
      total_warnings: totalWarnings,
      total_auto_fixes: totalAutoFixes,
      blocking: hasBlocked,
    };
  }

  getLastReport(): AuditReport | null {
    return this.lastReport;
  }

  getReportHistory(limit = 20): AuditReport[] {
    return this.reportHistory.slice(-limit);
  }

  getRegisteredChecks() {
    return this.checks.map((c) => ({
      id: c.id,
      name: c.name,
      frequency: c.frequency,
      last_run: c.last_run,
    }));
  }
}

export const continuousAuditEngine = new ContinuousAuditEngine();
