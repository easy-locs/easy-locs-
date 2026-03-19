import type { UiIssue, UiScore } from "./types";
import { clamp } from "./utils";

function penaltyForIssue(issue: UiIssue): number {
  switch (issue.severity) {
    case "critical": return 20;
    case "high": return 14;
    case "medium": return 8;
    case "low": return 4;
  }
}

export function computeUiScore(issues: UiIssue[]): UiScore {
  let clarity = 100;
  let consistency = 100;
  let mobile = 100;
  let conversion = 100;
  let accessibility = 100;

  for (const issue of issues) {
    const p = penaltyForIssue(issue);
    switch (issue.type) {
      case "dotted_labels":
      case "untranslated_keys":
      case "duplicate_heading":
        clarity -= p;
        consistency -= p * 0.7;
        break;
      case "broken_card_layout":
      case "broken_settings_grouping":
      case "empty_section":
        consistency -= p;
        conversion -= p * 0.7;
        break;
      case "overflow_x":
      case "image_shift":
        mobile -= p;
        consistency -= p * 0.7;
        break;
      case "tiny_tap_targets":
        accessibility -= p;
        mobile -= p * 0.7;
        break;
      case "missing_primary_cta":
        conversion -= p;
        clarity -= p * 0.5;
        break;
    }
  }

  const total = clamp(
    Math.round(
      clarity * 0.22 + consistency * 0.22 + mobile * 0.2 + conversion * 0.2 + accessibility * 0.16
    )
  );

  return {
    clarity: clamp(Math.round(clarity)),
    consistency: clamp(Math.round(consistency)),
    mobile: clamp(Math.round(mobile)),
    conversion: clamp(Math.round(conversion)),
    accessibility: clamp(Math.round(accessibility)),
    total,
  };
}
