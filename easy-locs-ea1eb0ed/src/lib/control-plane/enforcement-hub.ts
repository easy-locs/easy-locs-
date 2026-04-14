import { platformBus } from "@/lib/shared/platform-bus";
import { structuredLogger } from "@/lib/observability/structured-logger";
import { recordAction, quarantineDomain, isDomainQuarantined } from "./domain-health";
import { createIncident } from "./incident-engine";
import type { ControlDomain } from "./types";

export type EnforcementEngine =
  | "taxonomy"
  | "asset"
  | "data"
  | "ui"
  | "flow"
  | "realtime"
  | "security"
  | "repair";

export type ViolationSeverity = "info" | "warning" | "error" | "critical";

export type EnforcementDecision =
  | "auto_correct"
  | "quarantine"
  | "fallback"
  | "block"
  | "log_only";

export interface ViolationReport {
  id: string;
  engine: EnforcementEngine;
  domain: string;
  severity: ViolationSeverity;
  code: string;
  message: string;
  entityId?: string;
  entityType?: string;
  source: string;
  detectedAt: string;
  metadata?: Record<string, unknown>;
  confidenceScore?: number;
  suggestedAction?: EnforcementDecision;
}

export interface EnforcementAction {
  violationId: string;
  decision: EnforcementDecision;
  reason: string;
  executedAt: string;
  durationMs: number;
  success: boolean;
  fallbackUsed: boolean;
  rollbackTriggered: boolean;
}

interface DedupEntry {
  code: string;
  domain: string;
  lastSeen: number;
  count: number;
}

const DEDUP_WINDOW_MS = 5_000;
const MAX_VIOLATIONS = 2000;
const MAX_ACTIONS = 1000;

const violationLog: ViolationReport[] = [];
const actionLog: EnforcementAction[] = [];
const dedupMap = new Map<string, DedupEntry>();

let totalReceived = 0;
let totalDeduped = 0;
let totalActioned = 0;

function dedupKey(v: ViolationReport): string {
  return `${v.engine}:${v.domain}:${v.code}:${v.entityId ?? "global"}`;
}

function isDuplicate(v: ViolationReport): boolean {
  const key = dedupKey(v);
  const existing = dedupMap.get(key);
  if (!existing) return false;
  return Date.now() - existing.lastSeen < DEDUP_WINDOW_MS;
}

function recordDedup(v: ViolationReport): void {
  const key = dedupKey(v);
  const existing = dedupMap.get(key);
  if (existing) {
    existing.lastSeen = Date.now();
    existing.count++;
  } else {
    dedupMap.set(key, {
      code: v.code,
      domain: v.domain,
      lastSeen: Date.now(),
      count: 1,
    });
  }
  if (dedupMap.size > 5000) {
    const cutoff = Date.now() - 60_000;
    for (const [k, entry] of dedupMap) {
      if (entry.lastSeen < cutoff) dedupMap.delete(k);
    }
  }
}

function classifyDecision(v: ViolationReport): EnforcementDecision {
  if (v.suggestedAction) return v.suggestedAction;

  if (v.code?.startsWith("GATE_FAIL_PUBLISH")) return "block";
  if (v.source === "gate-runner" && v.severity === "critical") return "block";

  if (v.severity === "critical") {
    if (v.engine === "security") return "block";
    return "quarantine";
  }

  if (v.severity === "error") {
    if (v.confidenceScore != null && v.confidenceScore >= 0.8) return "auto_correct";
    return "quarantine";
  }

  if (v.severity === "warning") {
    if (v.confidenceScore != null && v.confidenceScore >= 0.9) return "auto_correct";
    return "fallback";
  }

  return "log_only";
}

function shouldEscalate(v: ViolationReport): boolean {
  if (v.severity === "critical") return true;
  const key = dedupKey(v);
  const entry = dedupMap.get(key);
  return (entry?.count ?? 0) >= 5;
}

export function receiveViolation(violation: ViolationReport): EnforcementAction {
  totalReceived++;
  const start = Date.now();

  if (isDuplicate(violation)) {
    totalDeduped++;
    recordDedup(violation);
    return {
      violationId: violation.id,
      decision: "log_only",
      reason: "Deduplicated within window",
      executedAt: new Date().toISOString(),
      durationMs: Date.now() - start,
      success: true,
      fallbackUsed: false,
      rollbackTriggered: false,
    };
  }

  recordDedup(violation);

  violationLog.push(violation);
  if (violationLog.length > MAX_VIOLATIONS) {
    violationLog.splice(0, violationLog.length - MAX_VIOLATIONS);
  }

  const decision = classifyDecision(violation);

  recordAction(
    (violation.domain as ControlDomain) || "taxonomy",
    `enforcement:${violation.code}`,
    decision !== "block",
  );

  if (shouldEscalate(violation)) {
    createIncident({
      domain: (violation.domain as ControlDomain) || "taxonomy",
      title: `[${violation.engine}] ${violation.code}`,
      description: violation.message,
      error_code: violation.code,
      auto_mitigated: decision === "auto_correct",
      is_security: violation.engine === "security",
    });
  }

  if (decision === "quarantine" && violation.domain) {
    const domainKey = violation.domain as ControlDomain;
    if (!isDomainQuarantined(domainKey)) {
      const key = dedupKey(violation);
      const entry = dedupMap.get(key);
      if ((entry?.count ?? 0) >= 10) {
        quarantineDomain(domainKey, `Repeated violations: ${violation.code}`, "enforcement-hub");
      }
    }
  }

  structuredLogger.info(
    "system",
    "enforcement.decision",
    `[${violation.engine}/${violation.severity}] ${violation.code} → ${decision}`,
    {
      payload_summary: {
        violationId: violation.id,
        engine: violation.engine,
        domain: violation.domain,
        decision,
        entityId: violation.entityId,
      },
    },
  );

  platformBus.emit("enforcement:violation_processed", {
    violationId: violation.id,
    engine: violation.engine,
    domain: violation.domain,
    decision,
    severity: violation.severity,
    entityId: violation.entityId,
    entityType: violation.entityType,
    code: violation.code,
    message: violation.message,
  }, "system");

  const action: EnforcementAction = {
    violationId: violation.id,
    decision,
    reason: `Classified by enforcement hub: severity=${violation.severity}, confidence=${violation.confidenceScore ?? "unknown"}`,
    executedAt: new Date().toISOString(),
    durationMs: Date.now() - start,
    success: true,
    fallbackUsed: decision === "fallback",
    rollbackTriggered: false,
  };

  actionLog.push(action);
  if (actionLog.length > MAX_ACTIONS) {
    actionLog.splice(0, actionLog.length - MAX_ACTIONS);
  }
  totalActioned++;

  return action;
}

export function getViolationLog(filters?: {
  engine?: EnforcementEngine;
  domain?: string;
  severity?: ViolationSeverity;
  limit?: number;
}): ViolationReport[] {
  let results = [...violationLog];
  if (filters?.engine) results = results.filter((v) => v.engine === filters.engine);
  if (filters?.domain) results = results.filter((v) => v.domain === filters.domain);
  if (filters?.severity) results = results.filter((v) => v.severity === filters.severity);
  return results.slice(-(filters?.limit ?? 100));
}

export function getActionLog(limit = 100): EnforcementAction[] {
  return actionLog.slice(-limit);
}

export function getEnforcementStats(): {
  totalReceived: number;
  totalDeduped: number;
  totalActioned: number;
  byEngine: Record<string, number>;
  byDecision: Record<string, number>;
  bySeverity: Record<string, number>;
} {
  const byEngine: Record<string, number> = {};
  const byDecision: Record<string, number> = {};
  const bySeverity: Record<string, number> = {};

  for (const v of violationLog) {
    byEngine[v.engine] = (byEngine[v.engine] ?? 0) + 1;
    bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;
  }

  for (const a of actionLog) {
    byDecision[a.decision] = (byDecision[a.decision] ?? 0) + 1;
  }

  return { totalReceived, totalDeduped, totalActioned, byEngine, byDecision, bySeverity };
}

export function enforceAtBoundary(
  entityId: string,
  boundaryType: "publish" | "write" | "ingest",
  opts?: { entityType?: string; domain?: string; source?: string },
): { allowed: boolean; reason: string; decision: EnforcementDecision } {
  const recentViolations = violationLog.filter(
    (v) => v.entityId === entityId,
  );

  const blocked = recentViolations.some((v) => {
    const action = actionLog.find((a) => a.violationId === v.id);
    return action?.decision === "block";
  });

  if (blocked) {
    return {
      allowed: false,
      reason: `Entity ${entityId} blocked by enforcement hub (active block decision)`,
      decision: "block",
    };
  }

  const quarantined = recentViolations.some((v) => {
    const action = actionLog.find((a) => a.violationId === v.id);
    return action?.decision === "quarantine";
  });

  if (quarantined && boundaryType === "publish") {
    return {
      allowed: false,
      reason: `Entity ${entityId} quarantined — publish blocked`,
      decision: "quarantine",
    };
  }

  if (quarantined && boundaryType === "write") {
    return {
      allowed: false,
      reason: `Entity ${entityId} quarantined — write blocked pending review`,
      decision: "quarantine",
    };
  }

  const domain = opts?.domain ?? "system";
  if (isDomainQuarantined(domain as ControlDomain)) {
    return {
      allowed: false,
      reason: `Domain ${domain} is quarantined — all ${boundaryType} operations blocked`,
      decision: "block",
    };
  }

  return { allowed: true, reason: "No enforcement blocks", decision: "log_only" };
}

export function clearEnforcementLogs(): void {
  violationLog.length = 0;
  actionLog.length = 0;
  dedupMap.clear();
  totalReceived = 0;
  totalDeduped = 0;
  totalActioned = 0;
}
