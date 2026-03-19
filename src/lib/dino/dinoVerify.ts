/**
 * DINO Verify — Re-checks issues after fixes are applied.
 */

import type { AutoFixResult } from "./dinoAutoFix";
import { hasDotSeparator, looksLikeI18nKey } from "@/lib/design/textSanitizer";

export interface VerificationResult {
  issueId: string;
  resolved: boolean;
  details: string;
}

/**
 * Verify that auto-fixes actually resolved the issues.
 */
export function verifyAutoFixes(results: AutoFixResult[]): VerificationResult[] {
  return results.map(r => {
    if (!r.applied) {
      return { issueId: r.issueId, resolved: false, details: "Fix was not applied" };
    }

    // Check the "after" value is clean
    const stillHasDots = hasDotSeparator(r.after);
    const stillLooksLikeKey = looksLikeI18nKey(r.after);

    if (stillHasDots || stillLooksLikeKey) {
      return {
        issueId: r.issueId,
        resolved: false,
        details: `After value still has issues: dots=${stillHasDots}, i18nKey=${stillLooksLikeKey}`,
      };
    }

    return { issueId: r.issueId, resolved: true, details: `Fixed: "${r.before}" → "${r.after}"` };
  });
}

/**
 * Generate a summary report from verification results.
 */
export function verificationSummary(results: VerificationResult[]): {
  total: number;
  resolved: number;
  unresolved: number;
  resolutionRate: number;
} {
  const resolved = results.filter(r => r.resolved).length;
  return {
    total: results.length,
    resolved,
    unresolved: results.length - resolved,
    resolutionRate: results.length > 0 ? Math.round((resolved / results.length) * 100) : 100,
  };
}
