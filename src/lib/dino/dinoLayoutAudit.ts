/**
 * DINO Layout Audit — Detects layout issues from structural metrics.
 */

import type { DinoIssue } from "./types";
import { classifyDinoIssue } from "./dinoIssueFactory";

export interface LayoutMetrics {
  route: string;
  hasOverflowX: boolean;
  overlapDetected: boolean;
  tinyTapTargets: boolean;
  unstableHeights: boolean;
  brokenGrid: boolean;
  inconsistentPadding: boolean;
}

export function auditLayoutFromMetrics(input: LayoutMetrics): DinoIssue[] {
  const issues: DinoIssue[] = [];

  if (input.hasOverflowX) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Horizontal overflow detected",
      issueType: "ui",
    }));
  }

  if (input.overlapDetected) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Card or block overlap detected",
      issueType: "ui",
    }));
  }

  if (input.tinyTapTargets) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Touch targets are too small (< 44px)",
      issueType: "ux",
    }));
  }

  if (input.unstableHeights) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Layout shift / unstable heights detected",
      issueType: "stability",
    }));
  }

  if (input.brokenGrid) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Broken grid alignment detected",
      issueType: "ui",
    }));
  }

  if (input.inconsistentPadding) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Inconsistent container padding detected",
      issueType: "branding",
    }));
  }

  return issues;
}
