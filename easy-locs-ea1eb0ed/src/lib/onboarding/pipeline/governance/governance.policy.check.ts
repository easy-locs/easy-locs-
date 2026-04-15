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
  lat?: number | null;
  lng?: number | null;
  cityBoundsCheck?: boolean;
}): PolicyCheckResult {
  const policy = getPolicy(params.vertical);
  const violations: string[] = [];

  const sourcePolicyMet = params.sourcesUsed.every((s) => isSourceAllowed(params.vertical, s));
  if (!sourcePolicyMet) {
    violations.push("forbidden source used");
  }

  const hasCoords = params.lat != null && params.lng != null;
  const coordsNonZero = hasCoords && !(params.lat === 0 && params.lng === 0);
  const coordsInBounds = hasCoords &&
    Math.abs(params.lat!) <= 90 && Math.abs(params.lng!) <= 180;
  const geoGateMet = hasCoords && coordsNonZero && coordsInBounds &&
    params.cityBoundsCheck !== false;
  if (!geoGateMet) {
    if (!hasCoords) {
      violations.push("missing geo coordinates");
    } else if (!coordsNonZero) {
      violations.push("geo coordinates are zero (null island)");
    } else if (!coordsInBounds) {
      violations.push("geo coordinates outside valid world bounds");
    } else if (params.cityBoundsCheck === false) {
      violations.push("geo coordinates fall outside declared city bounds");
    }
  }

  const qualityGateMet = params.qualityScore >= 55;
  if (!qualityGateMet) {
    violations.push(`quality score ${params.qualityScore} below minimum 55`);
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
