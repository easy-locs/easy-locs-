/**
 * DINO Issue Factory — Creates classified DinoIssue objects with auto-severity.
 */

import type { DinoIssue, DinoIssueType, DinoSeverity, DinoFixability } from "./types";

const SEVERITY_MAP: Record<DinoIssueType, DinoSeverity> = {
  ui: "medium",
  ux: "major",
  routing: "major",
  onboarding: "major",
  media: "medium",
  i18n: "medium",
  branding: "low",
  performance: "major",
  stability: "major",
  data: "critical",
  category: "medium",
};

const SAFE_FIX_TYPES: Set<DinoIssueType> = new Set([
  "i18n", "branding", "media", "category",
]);

export function classifyDinoIssue(input: {
  route: string;
  summary: string;
  issueType: DinoIssueType;
  component?: string;
  details?: Record<string, unknown>;
}): DinoIssue {
  const severity = SEVERITY_MAP[input.issueType] || "medium";
  const fixability: DinoFixability = SAFE_FIX_TYPES.has(input.issueType)
    ? "safe_auto_fix"
    : "patch_required";

  return {
    id: crypto.randomUUID(),
    route: input.route,
    component: input.component,
    severity,
    issueType: input.issueType,
    fixability,
    summary: input.summary,
    details: input.details || {},
    detectedAt: new Date().toISOString(),
    status: "open",
  };
}
