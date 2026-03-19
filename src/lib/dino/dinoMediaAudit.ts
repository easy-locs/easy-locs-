/**
 * DINO Media Audit — Detects inconsistent image ratios and missing placeholders.
 */

import { classifyDinoIssue } from "./dinoIssueFactory";
import type { DinoIssue } from "./types";

export interface MediaAuditInput {
  route: string;
  inconsistentRatios: boolean;
  missingImagePlaceholders: boolean;
  oversizedImages: number;
  missingAltText: number;
}

export function auditMedia(input: MediaAuditInput): DinoIssue[] {
  const issues: DinoIssue[] = [];

  if (input.inconsistentRatios) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Inconsistent image aspect ratios in card list",
      issueType: "media",
    }));
  }

  if (input.missingImagePlaceholders) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Missing image placeholders — may cause layout shift",
      issueType: "stability",
    }));
  }

  if (input.oversizedImages > 0) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: `${input.oversizedImages} oversized images detected (not optimized)`,
      issueType: "performance",
      details: { count: input.oversizedImages },
    }));
  }

  if (input.missingAltText > 0) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: `${input.missingAltText} images missing alt text`,
      issueType: "ux",
      details: { count: input.missingAltText },
    }));
  }

  return issues;
}
