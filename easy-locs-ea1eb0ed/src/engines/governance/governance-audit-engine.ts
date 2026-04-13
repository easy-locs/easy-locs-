/**
 * governance-audit-engine — Unified governance audit and auto-remediation.
 *
 * Merges: anti-conflict-engine + auto-remediation-engine
 *
 * Responsibilities:
 *   - Architecture debt registry (anti-conflict laws)
 *   - Aggregate violation summary across all governance engines
 *   - Automatic remediation for well-known violation patterns
 *
 * Single engine replaces two separate aggregator engines.
 */
import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type { GovernanceViolation, CanonicalVertical } from "@/domains/shared/canonical-types";
import { getPublishGateGovernanceViolations } from "@/lib/engines/publish-gate-base";
import { getVerticalViolations } from "./vertical-isolation-engine";
import { getTaxonomyViolations } from "./taxonomy-governance-engine";
import { getMediaViolations } from "./media-relevance-engine";
import { getTextViolations } from "./text-integrity-engine";
import { getLayoutViolations } from "./layout-integrity-engine";
import { getActionViolations } from "./flow-integrity-engine";
import { getBannerViolations } from "./banner-strategy-engine";
import { getLocalizationViolations } from "./localization-engine";
import { getPageOpenViolations } from "./page-open-engine";
import { getFlowViolations } from "./flow-integrity-engine";
import { platformBus } from "@/lib/shared/platform-bus";

// ── Architecture Debt (from anti-conflict) ───────────────────────────────────

export type ConflictLaw =
  | "no_duplicate_truth"
  | "no_category_inference_in_ui"
  | "no_media_validation_bypass"
  | "no_local_page_hacks"
  | "no_cross_vertical_reuse"
  | "no_runtime_only_fixes"
  | "no_untyped_action_dispatch"
  | "no_layout_patches_outside_ds"
  | "no_banners_outside_engine"
  | "no_translations_outside_governance";

interface ArchitectureDebt {
  id: string;
  law: ConflictLaw;
  owner: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  detectedAt: string;
  resolvedAt: string | null;
}

const debtRegistry: ArchitectureDebt[] = [];

export function reportArchitectureDebt(
  law: ConflictLaw,
  owner: string,
  severity: ArchitectureDebt["severity"],
  description: string
): ArchitectureDebt {
  const debt: ArchitectureDebt = {
    id: `debt-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    law, owner, severity, description,
    detectedAt: new Date().toISOString(),
    resolvedAt: null,
  };
  debtRegistry.push(debt);
  return debt;
}

export function getArchitectureDebt(): ArchitectureDebt[] {
  return [...debtRegistry];
}

export function getUnresolvedDebt(): ArchitectureDebt[] {
  return debtRegistry.filter((d) => d.resolvedAt === null);
}

export function getAllGovernanceViolations(): GovernanceViolation[] {
  return [
    ...getVerticalViolations(),
    ...getTaxonomyViolations(),
    ...getMediaViolations(),
    ...getTextViolations(),
    ...getLayoutViolations(),
    ...getActionViolations(),
    ...getBannerViolations(),
    ...getLocalizationViolations(),
    ...getPageOpenViolations(),
    ...getFlowViolations(),
    ...getPublishGateGovernanceViolations(),
  ];
}

export function getGovernanceSummary() {
  const all = getAllGovernanceViolations();
  const bySeverity: Record<string, number> = {};
  const byType: Record<string, number> = {};
  let unresolvedCount = 0;
  let autoRemediatedCount = 0;

  for (const v of all) {
    bySeverity[v.severity] = (bySeverity[v.severity] ?? 0) + 1;
    byType[v.type] = (byType[v.type] ?? 0) + 1;
    if (!v.resolvedAt) unresolvedCount++;
    if (v.autoRemediated) autoRemediatedCount++;
  }

  return {
    totalViolations: all.length,
    bySeverity, byType,
    unresolvedCount, autoRemediatedCount,
    architectureDebt: debtRegistry.filter((d) => !d.resolvedAt).length,
  };
}

// ── Auto-Remediation (from auto-remediation-engine) ─────────────────────────

export type RemediationAction =
  | "hide_invalid_media"
  | "swap_fallback_media"
  | "suppress_banner"
  | "quarantine_listing"
  | "disable_broken_cta"
  | "route_to_retry"
  | "downgrade_to_shell"
  | "isolate_subscription"
  | "queue_retriable";

interface RemediationRecord {
  id: string;
  violationId: string;
  action: RemediationAction;
  applied: boolean;
  appliedAt: string | null;
  rollbackAvailable: boolean;
  metadata: Record<string, unknown>;
}

const remediationLog: RemediationRecord[] = [];
const MAX_LOG = 1000;

const AUTO_REMEDIATION_RULES: Record<string, RemediationAction> = {
  invalid_media: "hide_invalid_media",
  cross_vertical_contamination: "quarantine_listing",
  dead_action: "disable_broken_cta",
  banner_conflict: "suppress_banner",
  layout_overflow: "downgrade_to_shell",
};

export function attemptRemediation(violation: GovernanceViolation): RemediationRecord | null {
  const action = AUTO_REMEDIATION_RULES[violation.type];
  if (!action) return null;
  if (violation.severity === "critical" && action !== "hide_invalid_media" && action !== "suppress_banner") return null;

  const record: RemediationRecord = {
    id: `rem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    violationId: violation.id,
    action,
    applied: true,
    appliedAt: new Date().toISOString(),
    rollbackAvailable: true,
    metadata: { violationType: violation.type, severity: violation.severity, source: violation.source },
  };

  remediationLog.push(record);
  if (remediationLog.length > MAX_LOG) remediationLog.splice(0, remediationLog.length - MAX_LOG);

  violation.autoRemediated = true;
  violation.resolvedAt = new Date().toISOString();

  platformBus.emit("ui-engine:report", { engineId: "governance-audit", remediation: record });
  return record;
}

export function getRemediationLog(): RemediationRecord[] {
  return [...remediationLog];
}

export function getRemediationStats() {
  const byAction: Record<string, number> = {};
  for (const r of remediationLog) byAction[r.action] = (byAction[r.action] ?? 0) + 1;

  const allViolations = [
    ...getMediaViolations(),
    ...getVerticalViolations(),
    ...getActionViolations(),
    ...getBannerViolations(),
    ...getLayoutViolations(),
  ];

  const autoRemediated = allViolations.filter((v) => v.autoRemediated).length;
  const autoRemediationRate = allViolations.length > 0 ? autoRemediated / allViolations.length : 0;
  return { total: remediationLog.length, byAction, autoRemediationRate };
}

// ── Engine Class ──────────────────────────────────────────────────────────────

export class GovernanceAuditEngine extends BaseEngine {
  constructor() {
    super({
      id: "governance-audit",
      name: "Governance Audit & Auto-Remediation Engine",
      category: "governance",
      intervalMs: 30_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const summary = getGovernanceSummary();
    const actions: string[] = [];

    if (summary.unresolvedCount > 0) actions.push(`UNRESOLVED: ${summary.unresolvedCount} violations`);
    const debt = getUnresolvedDebt();
    if (debt.length > 0) {
      actions.push(`ARCH_DEBT: ${debt.length} items`);
      for (const d of debt.slice(0, 3)) {
        actions.push(`  [${d.severity}] ${d.law}: ${d.description}`);
      }
    }

    const unremediated = [
      ...getMediaViolations(),
      ...getVerticalViolations(),
      ...getActionViolations(),
      ...getBannerViolations(),
      ...getLayoutViolations(),
    ].filter((v) => !v.autoRemediated && !v.resolvedAt);

    let remediatedCount = 0;
    for (const v of unremediated) {
      const result = attemptRemediation(v);
      if (result) {
        remediatedCount++;
        actions.push(`REMEDIATED: ${result.action} for ${v.type}`);
      }
    }

    return {
      level: summary.unresolvedCount > 10 ? "act" : summary.unresolvedCount > 0 ? "detect" : "observe",
      findings: summary.totalViolations,
      actions: actions.slice(0, 8),
      duration: 0,
    };
  }
}
