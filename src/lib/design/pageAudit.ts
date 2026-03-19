/**
 * Page Audit Engine — Design-layer audit for detecting UI/UX issues.
 * Used by DINO engine and admin audit dashboard.
 */

import { LAYOUT_RULES, type LayoutRule } from "./layoutRules";
import { hasDotSeparator, looksLikeI18nKey } from "./textSanitizer";

export type AuditFindingSeverity = "critical" | "major" | "minor";
export type AuditFindingType = "layout" | "spacing" | "typography" | "branding" | "form" | "image" | "responsive" | "i18n" | "stability" | "routing" | "interaction";
export type AuditFixability = "auto" | "patch" | "manual";

export interface DesignAuditFinding {
  id: string;
  ruleId?: string;
  page: string;
  type: AuditFindingType;
  severity: AuditFindingSeverity;
  description: string;
  expected: string;
  actual: string;
  fixability: AuditFixability;
  fixSuggestion?: string;
}

let findingCounter = 0;
function nextId(): string {
  return `daf-${++findingCounter}`;
}

/**
 * Audit a set of text labels for common issues.
 */
export function auditLabels(labels: string[], page: string): DesignAuditFinding[] {
  const findings: DesignAuditFinding[] = [];
  for (const label of labels) {
    if (hasDotSeparator(label)) {
      findings.push({
        id: nextId(),
        page,
        type: "i18n",
        severity: "major",
        description: `Dotted separator in label: "${label}"`,
        expected: "Space-separated words with Title Case",
        actual: label,
        fixability: "auto",
        fixSuggestion: "Apply sanitizeUiText()",
      });
    }
    if (looksLikeI18nKey(label)) {
      findings.push({
        id: nextId(),
        page,
        type: "i18n",
        severity: "critical",
        description: `Raw i18n key visible: "${label}"`,
        expected: "Translated human-readable text",
        actual: label,
        fixability: "patch",
        fixSuggestion: "Add missing translation or apply fallback",
      });
    }
  }
  return findings;
}

/**
 * Audit page structure against layout rules (static analysis).
 * Returns findings for each rule violation detected.
 */
export function auditPageStructure(pageId: string, checks: {
  h1Count?: number;
  hasHorizontalOverflow?: boolean;
  hasFixedHeaderHeight?: boolean;
  imagesWithoutDimensions?: number;
  touchTargetsBelowMin?: number;
}): DesignAuditFinding[] {
  const findings: DesignAuditFinding[] = [];

  if (checks.h1Count !== undefined && checks.h1Count !== 1) {
    findings.push({
      id: nextId(), ruleId: "ty-01", page: pageId,
      type: "typography", severity: "critical",
      description: `Page has ${checks.h1Count} H1 elements (expected exactly 1)`,
      expected: "1 H1", actual: String(checks.h1Count),
      fixability: "patch",
    });
  }

  if (checks.hasHorizontalOverflow) {
    findings.push({
      id: nextId(), ruleId: "rs-01", page: pageId,
      type: "responsive", severity: "critical",
      description: "Page has horizontal overflow on mobile",
      expected: "No horizontal scroll", actual: "overflow-x detected",
      fixability: "patch",
    });
  }

  if (checks.hasFixedHeaderHeight === false) {
    findings.push({
      id: nextId(), ruleId: "hd-01", page: pageId,
      type: "stability", severity: "major",
      description: "Page header does not have fixed height (may cause layout shift)",
      expected: "Fixed min-height on header", actual: "Dynamic header height",
      fixability: "patch",
    });
  }

  if (checks.imagesWithoutDimensions && checks.imagesWithoutDimensions > 0) {
    findings.push({
      id: nextId(), ruleId: "im-01", page: pageId,
      type: "image", severity: "critical",
      description: `${checks.imagesWithoutDimensions} images without explicit dimensions`,
      expected: "All images have width/height or aspect-ratio", actual: "Missing dimensions",
      fixability: "patch",
    });
  }

  if (checks.touchTargetsBelowMin && checks.touchTargetsBelowMin > 0) {
    findings.push({
      id: nextId(), ruleId: "rs-02", page: pageId,
      type: "responsive", severity: "major",
      description: `${checks.touchTargetsBelowMin} touch targets below 44px minimum`,
      expected: "All interactive elements ≥ 44px", actual: "Undersized targets found",
      fixability: "patch",
    });
  }

  return findings;
}

/**
 * Get all layout rules for reference.
 */
export function getAllLayoutRules(): LayoutRule[] {
  return LAYOUT_RULES;
}
