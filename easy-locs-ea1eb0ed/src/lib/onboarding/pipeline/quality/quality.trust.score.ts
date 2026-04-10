/**
 * quality.trust.score — Scores source trust/confidence.
 */
import type { QualityDimension } from "../contracts";

export function scoreTrust(params: {
  sourceCount: number; hasPrimarySource: boolean;
  mergeConfidence: number; hasVerifiedPhone: boolean;
}): QualityDimension {
  let score = 0;
  const details: string[] = [];
  if (params.sourceCount >= 3) score += 30;
  else if (params.sourceCount >= 2) score += 20;
  else { score += 10; details.push("single source"); }
  if (params.hasPrimarySource) score += 25; else details.push("no primary source");
  score += Math.round(params.mergeConfidence * 30);
  if (params.hasVerifiedPhone) score += 15; else details.push("unverified contact");
  score = Math.max(0, Math.min(100, score));
  return { dimension: "trust", score, weight: 0.15, details: details.join("; ") || "trusted" };
}
