/**
 * DINO V6 — Auto Boost System
 * Automatically boosts new, high-performing, and trending listings.
 */

export interface BoostCandidate {
  id: string;
  type: string;
  qualityScore: number;
  conversionRate: number;
  isNew: boolean;
  daysSinceCreated: number;
  trendingScore: number;   // 0-1
  currentBoost?: string | null;
}

export interface BoostDecision {
  entityId: string;
  boostType: "new_business" | "high_performer" | "trending" | "seasonal";
  tier: "basic" | "premium" | "featured";
  durationDays: number;
  reason: string;
}

export function evaluateBoostCandidates(candidates: BoostCandidate[]): BoostDecision[] {
  const decisions: BoostDecision[] = [];

  for (const c of candidates) {
    if (c.currentBoost) continue; // Already boosted

    // New business boost (first 14 days, quality > 50)
    if (c.isNew && c.daysSinceCreated <= 14 && c.qualityScore >= 50) {
      decisions.push({
        entityId: c.id,
        boostType: "new_business",
        tier: "basic",
        durationDays: 14 - c.daysSinceCreated,
        reason: `New business with quality ${c.qualityScore}/100`,
      });
      continue;
    }

    // High performer boost (quality > 85, conversion > 0.15)
    if (c.qualityScore >= 85 && c.conversionRate >= 0.15) {
      decisions.push({
        entityId: c.id,
        boostType: "high_performer",
        tier: "premium",
        durationDays: 7,
        reason: `High performer: quality ${c.qualityScore}, conversion ${Math.round(c.conversionRate * 100)}%`,
      });
      continue;
    }

    // Trending boost (trending score > 0.7, quality > 60)
    if (c.trendingScore > 0.7 && c.qualityScore >= 60) {
      decisions.push({
        entityId: c.id,
        boostType: "trending",
        tier: "basic",
        durationDays: 3,
        reason: `Trending: score ${Math.round(c.trendingScore * 100)}%`,
      });
    }
  }

  return decisions;
}
