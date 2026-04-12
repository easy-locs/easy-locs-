import { DataQualityEngine } from "../engine-base";
import type { EntityFinding, ExecutionMode, RemediationEntry, EngineRunLog } from "../types";
import { engineRegistry } from "../engine-registry";

interface AuditTrailEntry {
  timestamp: string;
  engineName: string;
  action: "detection" | "classification" | "auto_fix" | "quarantine" | "suppression" | "review_needed";
  entityId: string;
  source: string;
  vertical: string;
  beforeState?: string;
  afterState?: string;
  issueCodes: string[];
  confidence: "high" | "medium" | "low";
  evidence: string;
}

const auditTrail: AuditTrailEntry[] = [];
const MAX_TRAIL_SIZE = 2000;

export function getAuditTrail(): readonly AuditTrailEntry[] {
  return auditTrail;
}

export function getAuditTrailByEntity(entityId: string): AuditTrailEntry[] {
  return auditTrail.filter((e) => e.entityId === entityId);
}

export function getAuditTrailByEngine(engineName: string): AuditTrailEntry[] {
  return auditTrail.filter((e) => e.engineName === engineName);
}

export function getAuditTrailStats() {
  const byAction: Record<string, number> = {};
  const byEngine: Record<string, number> = {};

  for (const entry of auditTrail) {
    byAction[entry.action] = (byAction[entry.action] ?? 0) + 1;
    byEngine[entry.engineName] = (byEngine[entry.engineName] ?? 0) + 1;
  }

  return { total: auditTrail.length, byAction, byEngine };
}

function addEntry(entry: AuditTrailEntry): void {
  auditTrail.push(entry);
  if (auditTrail.length > MAX_TRAIL_SIZE) {
    auditTrail.splice(0, auditTrail.length - MAX_TRAIL_SIZE);
  }
}

export class AuditTrailEngine extends DataQualityEngine {
  constructor() {
    super("AuditTrailEngine", "Log every detection, classification, auto-fix, quarantine, suppression, and review-needed decision with before/after evidence", { priority: 10 });
  }

  scan(_mode: ExecutionMode): EntityFinding[] {
    return [];
  }

  classify(findings: EntityFinding[]): EntityFinding[] {
    return findings;
  }

  run(mode: ExecutionMode, cadence: import("../types").SweepCadence = "manual"): EngineRunLog {
    const startedAt = new Date().toISOString();
    const now = new Date().toISOString();

    const allFindings = engineRegistry.getAllFindings();
    const allRemediations = engineRegistry.getAllRemediations();

    let logged = 0;

    for (const f of allFindings) {
      if (f.issues.length > 0) {
        addEntry({
          timestamp: now,
          engineName: "aggregated",
          action: "detection",
          entityId: f.entityId,
          source: f.source,
          vertical: f.vertical,
          issueCodes: f.issues.map((i) => i.code),
          confidence: f.issues.some((i) => i.severity === "critical") ? "high" : "medium",
          evidence: `Classification: ${f.classification}, Issues: ${f.issues.map((i) => `${i.code}(${i.severity})`).join(", ")}`,
        });
        logged++;
      }
    }

    for (const r of allRemediations) {
      const action = r.action === "auto_fixed"
        ? "auto_fix" as const
        : r.action === "quarantined"
        ? "quarantine" as const
        : r.action === "suppressed"
        ? "suppression" as const
        : "review_needed" as const;

      addEntry({
        timestamp: r.timestamp,
        engineName: r.engineName ?? "unknown",
        action,
        entityId: r.entityId,
        source: r.source,
        vertical: "",
        beforeState: r.beforeState,
        afterState: r.afterState,
        issueCodes: [r.reason],
        confidence: r.confidence,
        evidence: `${r.action}: ${r.beforeState} → ${r.afterState} (${r.reason})`,
      });
      logged++;
    }

    return {
      engineName: this.name,
      startedAt,
      completedAt: new Date().toISOString(),
      mode,
      cadence,
      entitiesScanned: allFindings.length,
      issuesFound: logged,
      autoFixed: 0,
      quarantined: 0,
      suppressed: 0,
      reviewNeeded: 0,
      errors: 0,
      status: "success",
      batchSize: this.config.batchSize,
      message: `Logged ${logged} audit trail entries`,
    };
  }
}
