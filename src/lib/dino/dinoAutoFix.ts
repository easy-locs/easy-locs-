/**
 * DINO Auto-Fix — Applies safe automatic corrections.
 * Only touches issues classified as "auto" fixability.
 */

import { sanitizeUiText } from "@/lib/design/textSanitizer";
import type { ClassifiedIssue } from "./dinoIssueClassifier";

export interface AutoFixResult {
  issueId: string;
  applied: boolean;
  description: string;
  before: string;
  after: string;
}

/**
 * Apply safe auto-fixes to a set of classified issues.
 * Returns results describing what was fixed.
 */
export function applyAutoFixes(issues: ClassifiedIssue[]): AutoFixResult[] {
  const results: AutoFixResult[] = [];

  for (const issue of issues) {
    if (!issue.autoFixSafe) continue;

    const f = issue.finding;

    switch (f.type) {
      case "i18n": {
        if (f.fixSuggestion?.includes("sanitizeUiText")) {
          const fixed = sanitizeUiText(f.actual);
          results.push({
            issueId: f.id,
            applied: true,
            description: `Sanitized label: "${f.actual}" → "${fixed}"`,
            before: f.actual,
            after: fixed,
          });
        }
        break;
      }
      // Spacing and layout auto-fixes would apply CSS class corrections
      // These are structural and would be handled via component patches
      default:
        results.push({
          issueId: f.id,
          applied: false,
          description: `Auto-fix not implemented for type: ${f.type}`,
          before: f.actual,
          after: f.actual,
        });
    }
  }

  return results;
}

/**
 * Batch sanitize all text labels in a record/object.
 * Returns the cleaned object.
 */
export function autoFixLabelsInObject<T extends Record<string, unknown>>(obj: T, keys: (keyof T)[]): T {
  const result = { ...obj };
  for (const key of keys) {
    const val = result[key];
    if (typeof val === "string") {
      (result as any)[key] = sanitizeUiText(val);
    }
  }
  return result;
}
