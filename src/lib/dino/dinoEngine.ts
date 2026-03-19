/**
 * DINO Engine — Main orchestrator that runs the full audit pipeline.
 * Discover → Detect → Analyze → Fix → Verify
 */

import { runFullScan, type ScanResult } from "./dinoScanner";
import { auditLabels, auditPageStructure, type DesignAuditFinding } from "@/lib/design/pageAudit";
import { classifyFindings, issueSummary, groupByCategory, type ClassifiedIssue } from "./dinoIssueClassifier";
import { applyAutoFixes, type AutoFixResult } from "./dinoAutoFix";
import { generatePatches, type PatchProposal } from "./dinoPatchGenerator";
import { verifyAutoFixes, verificationSummary, type VerificationResult } from "./dinoVerify";
import { analyzeOnboardingHealth, type OnboardingHealthReport } from "./dinoOnboardingRecovery";

export interface DinoReport {
  scannedAt: string;
  scan: ScanResult;
  findings: DesignAuditFinding[];
  classifiedIssues: ClassifiedIssue[];
  autoFixResults: AutoFixResult[];
  patches: PatchProposal[];
  verificationResults: VerificationResult[];
  onboardingHealth: OnboardingHealthReport;
  summary: {
    totalPages: number;
    totalRoutes: number;
    totalIssues: number;
    critical: number;
    major: number;
    minor: number;
    autoFixed: number;
    patchRequired: number;
    manualRequired: number;
    verificationRate: number;
    onboardingFlows: number;
    healthyOnboardings: number;
  };
}

/**
 * Run the complete DINO audit pipeline.
 */
export function runDinoAudit(): DinoReport {
  // 1. DISCOVER
  const scan = runFullScan();

  // 2. DETECT — Run audits on known pages
  const findings: DesignAuditFinding[] = [];

  // Audit sample page structures (these would be populated by runtime checks in production)
  for (const page of scan.pages) {
    // Static text audit on page labels
    const labelsToCheck = [page.label, page.group];
    findings.push(...auditLabels(labelsToCheck, page.path));
  }

  // 3. ANALYZE
  const classifiedIssues = classifyFindings(findings);
  const summary = issueSummary(classifiedIssues);

  // 4. FIX
  const autoFixResults = applyAutoFixes(classifiedIssues);

  // 5. GENERATE PATCHES for non-auto issues
  const patches = generatePatches(classifiedIssues);

  // 6. VERIFY
  const verificationResults = verifyAutoFixes(autoFixResults);
  const vSummary = verificationSummary(verificationResults);

  // 7. ONBOARDING HEALTH
  const onboardingHealth = analyzeOnboardingHealth(scan.onboardingFlows);

  return {
    scannedAt: new Date().toISOString(),
    scan,
    findings,
    classifiedIssues,
    autoFixResults,
    patches,
    verificationResults,
    onboardingHealth,
    summary: {
      totalPages: scan.totalPages,
      totalRoutes: scan.totalRoutes,
      totalIssues: summary.total,
      critical: summary.critical,
      major: summary.major,
      minor: summary.minor,
      autoFixed: autoFixResults.filter(r => r.applied).length,
      patchRequired: summary.patchRequired,
      manualRequired: summary.manualRequired,
      verificationRate: vSummary.resolutionRate,
      onboardingFlows: onboardingHealth.totalFlows,
      healthyOnboardings: onboardingHealth.healthy,
    },
  };
}
