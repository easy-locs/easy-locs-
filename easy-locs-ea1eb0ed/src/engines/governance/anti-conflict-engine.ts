import { BaseEngine, type EngineTickResult } from "../core/base-engine";
import type { GovernanceViolation, CanonicalVertical } from "@/domains/shared/canonical-types";
import { getVerticalViolations } from "./vertical-isolation-engine";
import { getTaxonomyViolations } from "./taxonomy-governance-engine";
import { getMediaViolations } from "./media-relevance-engine";
import { getTextViolations } from "./text-integrity-engine";
import { getLayoutViolations } from "./layout-integrity-engine";
import { getActionViolations } from "./action-wiring-engine";
import { getBannerViolations } from "./banner-strategy-engine";
import { getLocalizationViolations } from "./localization-engine";
import { getPageOpenViolations } from "./page-open-engine";
import { getRuntimeViolations } from "./runtime-health-engine";
import { getFlowViolations } from "./flow-closure-engine";

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
    law,
    owner,
    severity,
    description,
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
    ...getRuntimeViolations(),
    ...getFlowViolations(),
  ];
}

export function getGovernanceSummary(): {
  totalViolations: number;
  bySeverity: Record<string, number>;
  byType: Record<string, number>;
  unresolvedCount: number;
  autoRemediatedCount: number;
  architectureDebt: number;
} {
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
    bySeverity,
    byType,
    unresolvedCount,
    autoRemediatedCount,
    architectureDebt: debtRegistry.filter((d) => !d.resolvedAt).length,
  };
}

export class AntiConflictEngine extends BaseEngine {
  constructor() {
    super({
      id: "anti-conflict",
      name: "Anti-Conflict Enforcement Engine",
      category: "governance",
      intervalMs: 60_000,
    });
  }

  async tick(): Promise<EngineTickResult> {
    const summary = getGovernanceSummary();
    const actions: string[] = [];

    if (summary.unresolvedCount > 0) {
      actions.push(`UNRESOLVED: ${summary.unresolvedCount} violations`);
    }

    const debt = getUnresolvedDebt();
    if (debt.length > 0) {
      actions.push(`ARCH_DEBT: ${debt.length} items`);
      for (const d of debt.slice(0, 3)) {
        actions.push(`  [${d.severity}] ${d.law}: ${d.description}`);
      }
    }

    for (const [type, count] of Object.entries(summary.byType)) {
      if (count > 5) {
        actions.push(`TREND: ${type} = ${count} violations`);
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
