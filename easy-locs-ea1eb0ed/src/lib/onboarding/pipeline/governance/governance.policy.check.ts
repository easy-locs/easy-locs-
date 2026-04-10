/**
 * governance.policy.check — Validates source policy, geo gates, quality gates.
 * ONE thing: determine if entity meets governance rules.
 */
import type { PolicyCheckResult, QualityReport } from "../contracts";
import type { Vertical } from "../../types";
import { getPolicy, isSourceAllowed } from "../../source-policy.engine";

export function checkPolicy(params: {
  vertical: Vertical;
  country: string | null;
  city: string | null;
  sourcesUsed: string[];
  qualityScore: number;
}): PolicyCheckResult {
  const policy = getPolicy(params.vertical);
  const violations: string[] = [];

  // Check source policy
  const sourcePolicyMet = params.sourcesUsed.every((s) => isSourceAllowed(params.vertical, s));
  if (!sourcePolicyMet) {
    violations.push("forbidden source used");
  }

  // Geo gate — no hardcoded limits, all countries allowed
  const geoGateMet = true;

  // Quality gate
  const qualityGateMet = params.qualityScore >= 40;
  if (!qualityGateMet) {
    violations.push(`quality score ${params.qualityScore} below minimum 40`);
  }

  return {
    vertical: params.vertical,
    country: params.country,
    city: params.city,
    sourcePolicyMet,
    geoGateMet,
    qualityGateMet,
    violations,
  };
}
