/**
 * DINO Stability Audit — Detects flicker, theme flash, remount spikes.
 */

import { classifyDinoIssue } from "./dinoIssueFactory";
import type { DinoIssue } from "./types";

export interface StabilityMetrics {
  route: string;
  flickerDetected: boolean;
  themeFlashDetected: boolean;
  remountSpikeDetected: boolean;
  skeletonFlashMs?: number;
  layoutShiftScore?: number;
}

export function auditStability(input: StabilityMetrics): DinoIssue[] {
  const issues: DinoIssue[] = [];

  if (input.flickerDetected) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Fast page flicker detected on open",
      issueType: "stability",
    }));
  }

  if (input.themeFlashDetected) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Theme/background flash on page load",
      issueType: "stability",
    }));
  }

  if (input.remountSpikeDetected) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: "Excessive component remounts detected",
      issueType: "performance",
    }));
  }

  if (input.skeletonFlashMs && input.skeletonFlashMs < 100) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: `Skeleton flash too brief (${input.skeletonFlashMs}ms) — causes visual noise`,
      issueType: "stability",
      details: { durationMs: input.skeletonFlashMs },
    }));
  }

  if (input.layoutShiftScore && input.layoutShiftScore > 0.25) {
    issues.push(classifyDinoIssue({
      route: input.route,
      summary: `High cumulative layout shift (${input.layoutShiftScore.toFixed(2)})`,
      issueType: "stability",
      details: { cls: input.layoutShiftScore },
    }));
  }

  return issues;
}
