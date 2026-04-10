/**
 * AI Operating Layer — Central Orchestrator
 * Runs all 15 audit engines and computes global quality scores.
 */

import type { AuditReport, AuditIssue, ModuleScore, AuditCategory, AuditSeverity } from "./types";
import { SEVERITY_WEIGHTS, CATEGORY_LABELS } from "./types";
import { runUIUXAudit } from "./engines/ui-ux-engine";
import { runSEOAudit } from "./engines/seo-engine";
import { runTechnicalAudit } from "./engines/technical-engine";
import { runMarketplaceAudit } from "./engines/marketplace-engine";
import { runInternationalAudit } from "./engines/international-engine";
import {
  runConversionAudit, runCommunicationAudit, runSecurityAudit,
  runBrandAudit, runDataQualityAudit, runAnalyticsAudit,
  runMobileAudit, runPaymentAudit, runBookingAudit, runContentAudit,
} from "./engines/simple-engines";

export type { AuditReport, AuditIssue, ModuleScore, AuditCategory };
export { CATEGORY_LABELS, SEVERITY_WEIGHTS };

// Re-export trigger system
export {
  dispatchTriggerAudit, triggerPageAudit, auditSyncResult,
  reportUIRegression, reportRouteError,
  auditPaymentResult, auditBookingResult, auditNotificationResult,
  auditListingPublish, auditListingUpdate,
  getTriggerIssues, subscribeTriggerAudit,
} from "./triggers";

// Re-export auto-fix system
export { autoFixIssue, autoFixAll } from "./auto-fix";
export type { AutoFixResult } from "./auto-fix";

// Re-export integration hooks
export {
  wrapPaymentAudit, wrapBookingAudit,
  notifyListingPublished, notifyListingUpdated,
  notifyNotificationResult,
} from "./hooks";

type ScanType = AuditReport["scanType"];

function computeModuleScore(category: AuditCategory, issues: AuditIssue[]): ModuleScore {
  const moduleIssues = issues.filter((i) => i.category === category);
  const penalty = moduleIssues.reduce((sum, i) => sum + SEVERITY_WEIGHTS[i.severity], 0);
  const score = Math.max(0, Math.min(100, 100 - penalty));

  return {
    category,
    label: CATEGORY_LABELS[category],
    score,
    issueCount: moduleIssues.length,
    criticalCount: moduleIssues.filter((i) => i.severity === "critical").length,
    lastScan: new Date().toISOString(),
    trend: "stable",
  };
}

function computeGlobalScore(modules: ModuleScore[]): number {
  if (modules.length === 0) return 100;
  const total = modules.reduce((sum, m) => sum + m.score, 0);
  return Math.round(total / modules.length);
}

export async function runFullAudit(scanType: ScanType = "full"): Promise<AuditReport> {
  const allIssues: AuditIssue[] = [];

  // Sync engines
  const syncEngines: Array<{ category: AuditCategory; run: () => AuditIssue[] }> = [
    { category: "ui_ux", run: runUIUXAudit },
    { category: "seo", run: runSEOAudit },
    { category: "technical", run: runTechnicalAudit },
    { category: "international", run: runInternationalAudit },
    { category: "conversion", run: runConversionAudit },
    { category: "communication", run: runCommunicationAudit },
    { category: "security", run: runSecurityAudit },
    { category: "brand", run: runBrandAudit },
    { category: "data_quality", run: runDataQualityAudit },
    { category: "analytics", run: runAnalyticsAudit },
    { category: "mobile", run: runMobileAudit },
    { category: "payment", run: runPaymentAudit },
    { category: "booking", run: runBookingAudit },
    { category: "content", run: runContentAudit },
  ];

  syncEngines.forEach(({ run }) => {
    try {
      allIssues.push(...run());
    } catch (e) {
      console.warn("[AI Audit] Engine failed:", e);
    }
  });

  // Async engines
  try {
    const marketplaceIssues = await runMarketplaceAudit();
    allIssues.push(...marketplaceIssues);
  } catch (e) {
    console.warn("[AI Audit] Marketplace engine failed:", e);
  }

  const categories: AuditCategory[] = [
    "ui_ux", "seo", "technical", "marketplace", "international",
    "conversion", "communication", "security", "brand", "data_quality",
    "analytics", "mobile", "payment", "booking", "content",
  ];

  const modules = categories.map((c) => computeModuleScore(c, allIssues));
  const globalScore = computeGlobalScore(modules);

  return {
    globalScore,
    modules,
    issues: allIssues.sort((a, b) => {
      const sw = SEVERITY_WEIGHTS;
      return sw[b.severity] - sw[a.severity];
    }),
    scannedAt: new Date().toISOString(),
    scanType,
    totalPages: 1,
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter((i) => i.severity === "critical").length,
  };
}

/** Quick scan — only critical engines */
export async function runLightAudit(): Promise<AuditReport> {
  const allIssues: AuditIssue[] = [];

  [runSEOAudit, runSecurityAudit, runMobileAudit, runTechnicalAudit].forEach((run) => {
    try { allIssues.push(...run()); } catch {}
  });

  const categories: AuditCategory[] = ["seo", "security", "mobile", "technical"];
  const modules = categories.map((c) => computeModuleScore(c, allIssues));

  return {
    globalScore: computeGlobalScore(modules),
    modules,
    issues: allIssues.sort((a, b) => SEVERITY_WEIGHTS[b.severity] - SEVERITY_WEIGHTS[a.severity]),
    scannedAt: new Date().toISOString(),
    scanType: "light",
    totalPages: 1,
    totalIssues: allIssues.length,
    criticalIssues: allIssues.filter((i) => i.severity === "critical").length,
  };
}
