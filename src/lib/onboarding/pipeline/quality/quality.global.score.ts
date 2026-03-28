/**
 * quality.global.score — Computes weighted global quality score from all dimensions.
 * ONE thing: aggregate dimension scores.
 */
import type { QualityReport, QualityDimension } from "../contracts";
import type { Vertical } from "../../types";

export function computeGlobalScore(
  dimensions: QualityDimension[],
  missingFields: string[],
  vertical: Vertical,
): QualityReport {
  const totalWeight = dimensions.reduce((s, d) => s + d.weight, 0);
  const globalScore = totalWeight > 0
    ? Math.round(dimensions.reduce((s, d) => s + d.score * d.weight, 0) / totalWeight)
    : 0;

  const warnings = dimensions
    .filter((d) => d.score < 40)
    .map((d) => `Low ${d.dimension}: ${d.details}`);

  const readyToPublish = globalScore >= 70 && missingFields.length <= 1;

  const byName = (name: string) => dimensions.find((d) => d.dimension === name)
    ?? { dimension: name, score: 0, weight: 0, details: "not evaluated" };

  return {
    completeness: byName("completeness"),
    media: byName("media"),
    location: byName("location"),
    catalog: byName("catalog"),
    trust: byName("trust"),
    globalScore,
    missingFields,
    warnings,
    readyToPublish,
  };
}
