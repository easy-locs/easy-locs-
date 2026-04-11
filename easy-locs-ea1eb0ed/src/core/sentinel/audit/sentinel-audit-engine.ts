import type { AuditRunRecord, AuditRunStatus } from "../types";
import type { EngineAuditResult } from "../contracts";
import { sentinelEngineRegistry } from "../registry/engine-registry";
import { sentinelConflictEngine } from "../conflict/sentinel-conflict-engine";
import { sentinelInvariantEngine } from "../invariants/invariant-engine";
import { sentinelHealthEngine } from "../health/sentinel-health-engine";
import { sentinelIncidentEngine } from "../incidents/sentinel-incident-engine";
import { sentinelTelemetryEngine } from "../telemetry/sentinel-telemetry-engine";

let auditCounter = 0;
function nextAuditId(): string {
  return `AUDIT_${Date.now()}_${++auditCounter}`;
}

type AuditType =
  | "engine_health" | "cron_health" | "source_of_truth" | "taxonomy"
  | "media" | "seo" | "performance" | "route" | "card" | "wallet_flow"
  | "orbit_flow" | "delivery_flow" | "flight_flow" | "search_integrity"
  | "state_machine" | "security" | "dependency" | "release_gate"
  | "full_god_audit";

interface AuditSchedule {
  audit_type: AuditType;
  interval_ms: number;
  last_run: number;
  enabled: boolean;
}

class SentinelAuditEngine {
  private schedules: AuditSchedule[] = [];
  private runHistory: AuditRunRecord[] = [];
  private _timer: ReturnType<typeof setInterval> | null = null;
  private _running = false;
  private readonly MAX_HISTORY = 500;

  constructor() {
    this.registerBuiltinSchedules();
  }

  private registerBuiltinSchedules(): void {
    const defs: Array<{ type: AuditType; interval: string }> = [
      { type: "engine_health", interval: "1m" },
      { type: "cron_health", interval: "5m" },
      { type: "source_of_truth", interval: "10m" },
      { type: "taxonomy", interval: "15m" },
      { type: "media", interval: "15m" },
      { type: "seo", interval: "30m" },
      { type: "performance", interval: "30m" },
      { type: "route", interval: "15m" },
      { type: "card", interval: "15m" },
      { type: "wallet_flow", interval: "5m" },
      { type: "orbit_flow", interval: "5m" },
      { type: "delivery_flow", interval: "5m" },
      { type: "flight_flow", interval: "10m" },
      { type: "search_integrity", interval: "30m" },
      { type: "state_machine", interval: "10m" },
      { type: "security", interval: "1h" },
      { type: "dependency", interval: "6h" },
      { type: "release_gate", interval: "10m" },
      { type: "full_god_audit", interval: "24h" },
    ];

    const intervalMap: Record<string, number> = {
      "1m": 60_000, "5m": 300_000, "10m": 600_000, "15m": 900_000,
      "30m": 1_800_000, "1h": 3_600_000, "6h": 21_600_000, "24h": 86_400_000,
    };

    for (const d of defs) {
      this.schedules.push({
        audit_type: d.type,
        interval_ms: intervalMap[d.interval] || 600_000,
        last_run: 0,
        enabled: true,
      });
    }
  }

  start(): void {
    if (this._running) return;
    this._running = true;
    this._timer = setInterval(() => this.tick(), 30_000);
  }

  stop(): void {
    this._running = false;
    if (this._timer) {
      clearInterval(this._timer);
      this._timer = null;
    }
  }

  private async tick(): Promise<void> {
    const now = Date.now();
    for (const schedule of this.schedules) {
      if (!schedule.enabled) continue;
      if (now - schedule.last_run < schedule.interval_ms) continue;
      schedule.last_run = now;
      await this.runAudit(schedule.audit_type);
    }
  }

  async runAudit(auditType: AuditType | string): Promise<AuditRunRecord> {
    const auditId = nextAuditId();
    const record: AuditRunRecord = {
      audit_run_id: auditId,
      audit_type: auditType,
      engine_id: "sentinel-audit",
      started_at: Date.now(),
      ended_at: 0,
      status: "running",
      score: 0,
      blocking_issues: 0,
      warnings: 0,
      auto_fixes_count: 0,
      report_path: "",
    };

    try {
      switch (auditType) {
        case "engine_health": {
          const health = sentinelHealthEngine.checkAllHeartbeats();
          record.score = health.unhealthy.length === 0 ? 100 : Math.max(0, 100 - health.unhealthy.length * 20 - health.degraded.length * 10);
          record.blocking_issues = health.unhealthy.length;
          record.warnings = health.degraded.length;
          if (health.unhealthy.length > 0) {
            for (const eid of health.unhealthy) {
              sentinelIncidentEngine.open("critical", "engine_health", eid, `Engine ${eid} unhealthy`, "Heartbeat check failed");
            }
          }
          break;
        }
        case "source_of_truth": {
          const invariantResult = sentinelInvariantEngine.checkBlocking();
          record.score = invariantResult.passed ? 100 : Math.max(0, 100 - invariantResult.failures.length * 15);
          record.blocking_issues = invariantResult.failures.filter((f) => f.blocking).length;
          record.warnings = invariantResult.failures.filter((f) => !f.blocking).length;
          break;
        }
        case "full_god_audit": {
          const contracts = sentinelEngineRegistry.getAll();
          let totalScore = 0;
          let auditCount = 0;
          for (const eng of contracts) {
            const contract = sentinelEngineRegistry.getContract(eng.engine_id);
            if (contract) {
              try {
                const result: EngineAuditResult = await contract.runAudit();
                totalScore += result.score;
                auditCount++;
                record.blocking_issues += result.blocking_issues;
                record.warnings += result.warnings;
                record.auto_fixes_count += result.auto_fixes_applied;
              } catch {}
            }
          }
          record.score = auditCount > 0 ? Math.round(totalScore / auditCount) : 0;

          const conflictScan = sentinelConflictEngine.runFullScan();
          record.blocking_issues += conflictScan.filter((c) => c.severity === "critical").length;
          record.warnings += conflictScan.filter((c) => c.severity !== "critical").length;
          break;
        }
        default: {
          const allInvariants = sentinelInvariantEngine.checkAll();
          const domainInvariants = allInvariants.filter((r) => r.invariant_id.toLowerCase().includes(auditType));
          record.score = domainInvariants.length > 0
            ? Math.round((domainInvariants.filter((r) => r.passed).length / domainInvariants.length) * 100)
            : 100;
          record.blocking_issues = domainInvariants.filter((r) => !r.passed && r.blocking).length;
          record.warnings = domainInvariants.filter((r) => !r.passed && !r.blocking).length;
          break;
        }
      }

      record.status = "completed";
    } catch (err) {
      record.status = "failed";
      record.score = 0;
      sentinelIncidentEngine.open("high", "audit_failure", "sentinel-audit", `Audit ${auditType} failed`, err instanceof Error ? err.message : String(err), auditId);
    }

    record.ended_at = Date.now();
    this.addHistory(record);
    sentinelTelemetryEngine.emit("audit:completed", "sentinel-audit", { audit_type: auditType, score: record.score, blocking: record.blocking_issues });

    return record;
  }

  async runOnEvent(event: "deploy" | "schema_change" | "migration" | "taxonomy_change"): Promise<AuditRunRecord[]> {
    const eventAudits: Record<string, AuditType[]> = {
      deploy: ["engine_health", "release_gate", "full_god_audit"],
      schema_change: ["source_of_truth", "taxonomy", "state_machine"],
      migration: ["source_of_truth", "taxonomy", "route"],
      taxonomy_change: ["taxonomy", "source_of_truth", "seo"],
    };

    const types = eventAudits[event] || ["engine_health"];
    const results: AuditRunRecord[] = [];
    for (const t of types) {
      results.push(await this.runAudit(t));
    }
    return results;
  }

  private addHistory(record: AuditRunRecord): void {
    this.runHistory.push(record);
    if (this.runHistory.length > this.MAX_HISTORY) {
      this.runHistory.splice(0, this.runHistory.length - this.MAX_HISTORY);
    }
  }

  getHistory(limit = 50): AuditRunRecord[] {
    return this.runHistory.slice(-limit);
  }

  getByType(auditType: string): AuditRunRecord[] {
    return this.runHistory.filter((r) => r.audit_type === auditType);
  }

  getStats(): { total_runs: number; running: boolean; last_full_audit: number; avg_score: number; schedules: number } {
    const scores = this.runHistory.filter((r) => r.status === "completed").map((r) => r.score);
    return {
      total_runs: this.runHistory.length,
      running: this._running,
      last_full_audit: this.runHistory.filter((r) => r.audit_type === "full_god_audit").slice(-1)[0]?.ended_at || 0,
      avg_score: scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      schedules: this.schedules.length,
    };
  }
}

export const sentinelAuditEngine = new SentinelAuditEngine();
