/**
 * Onboarding Quality Score Engine — Computes a weighted quality score
 * combining data completeness, source diversity, and content richness.
 */
import type { OnboardingVertical } from "./source-policy.engine";
import type { CanonicalMerchantRecord } from "./missing-fields.engine";
import { detectMissingFields } from "./missing-fields.engine";

export interface QualityScoreResult {
  overallScore: number; // 0-100
  breakdown: {
    completeness: number;
    sourceDiversity: number;
    contentRichness: number;
    mediaQuality: number;
  };
  tier: "premium" | "standard" | "basic" | "incomplete";
}

export function computeQualityScore(
  record: CanonicalMerchantRecord,
  sourceCount: number = 1
): QualityScoreResult {
  const { completenessScore } = detectMissingFields(record);

  // Source diversity (multi-source = higher trust)
  const sourceDiversity = Math.min(sourceCount * 25, 100);

  // Content richness
  let contentRichness = 0;
  if (record.description && record.description.length > 50) contentRichness += 30;
  if (record.categories && record.categories.length > 0) contentRichness += 20;
  if (record.opening_hours_json) contentRichness += 15;
  if (record.phone) contentRichness += 15;
  if (record.website) contentRichness += 10;
  if (record.rating != null) contentRichness += 10;
  contentRichness = Math.min(contentRichness, 100);

  // Media quality
  let mediaQuality = 0;
  const photoCount = record.photos_json?.length ?? 0;
  if (photoCount >= 5) mediaQuality = 100;
  else if (photoCount >= 3) mediaQuality = 75;
  else if (photoCount >= 1) mediaQuality = 40;
  if (record.logo_url) mediaQuality = Math.min(mediaQuality + 20, 100);

  // Weighted overall
  const overallScore = Math.round(
    completenessScore * 0.35 +
    sourceDiversity * 0.2 +
    contentRichness * 0.25 +
    mediaQuality * 0.2
  );

  let tier: QualityScoreResult["tier"];
  if (overallScore >= 80) tier = "premium";
  else if (overallScore >= 60) tier = "standard";
  else if (overallScore >= 40) tier = "basic";
  else tier = "incomplete";

  return {
    overallScore,
    breakdown: { completeness: completenessScore, sourceDiversity, contentRichness, mediaQuality },
    tier,
  };
}
