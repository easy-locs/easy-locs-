import type { DetectedIssue, ProtectionReaction, SafeAutoFixRule } from "./types";

const SAFE_FIX_RULES: SafeAutoFixRule[] = [];

function reaction(
  issue: DetectedIssue,
  details: string,
  verified = true,
  verificationResult = "safe_fix_applied",
): ProtectionReaction {
  return {
    issueId: issue.id,
    action: "auto_fixed",
    domain: issue.domain,
    severity: issue.severity,
    details,
    autoFixed: true,
    verified,
    verificationResult,
    remainingRisk: "none",
    reactedAt: new Date().toISOString(),
  };
}

SAFE_FIX_RULES.push({
  id: "ui_fallback_state",
  category: "card_broken",
  description: "Apply safe fallback rendering for broken cards",
  condition: (issue) => issue.severity === "low" || issue.severity === "medium",
  fix: (issue) => reaction(issue, `Fallback UI rendered for ${issue.entityId || "unknown"} — original card data incomplete`),
});

SAFE_FIX_RULES.push({
  id: "ui_normalization",
  category: "ui_normalization",
  description: "Apply safe UI normalization (line clamp, overflow, empty states)",
  condition: () => true,
  fix: (issue) => reaction(issue, "UI normalization applied: safe line clamp / overflow / empty state defaults"),
});

SAFE_FIX_RULES.push({
  id: "missing_data_defaults",
  category: "missing_data",
  description: "Apply safe default values for non-critical missing data",
  condition: (issue) => issue.severity !== "critical" && issue.severity !== "high",
  fix: (issue) => reaction(issue, `Default empty state applied for missing data on ${issue.entityId || "component"}`),
});

SAFE_FIX_RULES.push({
  id: "render_fallback_template",
  category: "render_mismatch",
  description: "Use safe fallback template when requested template is invalid",
  condition: (issue) => issue.severity === "medium",
  fix: (issue) => reaction(
    issue,
    `Fallback template "GenericCard" used for entity ${issue.entityId || "unknown"} — original template not allowed`,
    true,
    "fallback_template_safe",
  ),
});

SAFE_FIX_RULES.push({
  id: "template_invalid_fallback",
  category: "template_invalid",
  description: "Render GenericCard when template/entity pairing is impossible",
  condition: (issue) => issue.severity !== "critical",
  fix: (issue) => reaction(issue, `Template fallback applied for entity ${issue.entityId || "unknown"}`),
});

export function attemptSafeAutoFix(issue: DetectedIssue): ProtectionReaction | null {
  const DANGEROUS_CATEGORIES = new Set([
    "wallet_inconsistent",
    "otp_abuse",
    "auth_suspicious",
    "cross_vertical",
    "canonical_conflict",
  ]);

  if (DANGEROUS_CATEGORIES.has(issue.category)) return null;
  if (issue.severity === "critical") return null;

  for (const rule of SAFE_FIX_RULES) {
    if (rule.category === issue.category && rule.condition(issue)) {
      return rule.fix(issue);
    }
  }

  return null;
}

export function isSafeToAutoFix(issue: DetectedIssue): boolean {
  return attemptSafeAutoFix(issue) !== null;
}

export function registerSafeFixRule(rule: SafeAutoFixRule): void {
  SAFE_FIX_RULES.push(rule);
}

export function getSafeFixRules(): SafeAutoFixRule[] {
  return [...SAFE_FIX_RULES];
}
