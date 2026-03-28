/**
 * quality.location.score — Scores geo/location data quality.
 */
import type { QualityDimension } from "../contracts";

export function scoreLocation(params: {
  hasAddress: boolean; hasCity: boolean; hasCountry: boolean;
  hasCoords: boolean; hasZone: boolean;
}): QualityDimension {
  let score = 0;
  const details: string[] = [];
  if (params.hasAddress) score += 30; else details.push("no address");
  if (params.hasCity) score += 25; else details.push("no city");
  if (params.hasCountry) score += 15; else details.push("no country");
  if (params.hasCoords) score += 20; else details.push("no coordinates");
  if (params.hasZone) score += 10; else details.push("no zone");
  score = Math.max(0, Math.min(100, score));
  return { dimension: "location", score, weight: 0.15, details: details.join("; ") || "location complete" };
}
