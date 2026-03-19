/**
 * DINO V6 — Smart Ranking Engine
 * Dynamically ranks listings based on quality, conversion, media, recency, and location.
 */

export interface RankableEntity {
  id: string;
  type: "restaurant" | "property" | "service" | "travel" | "shop";
  qualityScore: number;         // 0-100 from Dino
  conversionRate: number;       // 0-1
  clickRate: number;            // 0-1
  completionRate: number;       // 0-1
  mediaQuality: number;         // 0-100
  profileCompleteness: number;  // 0-1
  recencyDays: number;          // days since last update
  distanceKm?: number | null;
  reviewCount: number;
  rating: number;               // 0-5
  isNewBusiness: boolean;
  boostTier?: string | null;
  boostUntil?: string | null;
}

export interface RankingResult {
  id: string;
  score: number;
  rank: number;
  boostApplied: boolean;
  newBusinessBoost: boolean;
  penaltyReason?: string;
}

const RANKING_WEIGHTS = {
  quality:          0.20,
  conversion:       0.15,
  clicks:           0.10,
  completion:       0.10,
  media:            0.10,
  profile:          0.08,
  recency:          0.07,
  distance:         0.08,
  reviews:          0.07,
  rating:           0.05,
};

function recencyScore(days: number): number {
  if (days <= 1) return 1;
  if (days <= 7) return 0.85;
  if (days <= 30) return 0.6;
  if (days <= 90) return 0.3;
  return 0.1;
}

function distanceNorm(km: number | null | undefined): number {
  if (km == null) return 0.5;
  if (km <= 1) return 1;
  if (km <= 5) return 0.8;
  if (km <= 15) return 0.5;
  if (km <= 50) return 0.3;
  return 0.1;
}

function isBoostActive(entity: RankableEntity): boolean {
  if (!entity.boostTier || !entity.boostUntil) return false;
  return new Date(entity.boostUntil) > new Date();
}

const BOOST_MULTIPLIERS: Record<string, number> = { featured: 1.25, premium: 1.15, basic: 1.05 };

export function rankEntities(entities: RankableEntity[]): RankingResult[] {
  const scored = entities.map(entity => {
    let score =
      (entity.qualityScore / 100) * RANKING_WEIGHTS.quality +
      entity.conversionRate * RANKING_WEIGHTS.conversion +
      entity.clickRate * RANKING_WEIGHTS.clicks +
      entity.completionRate * RANKING_WEIGHTS.completion +
      (entity.mediaQuality / 100) * RANKING_WEIGHTS.media +
      entity.profileCompleteness * RANKING_WEIGHTS.profile +
      recencyScore(entity.recencyDays) * RANKING_WEIGHTS.recency +
      distanceNorm(entity.distanceKm) * RANKING_WEIGHTS.distance +
      Math.min(1, entity.reviewCount / 50) * RANKING_WEIGHTS.reviews +
      (entity.rating / 5) * RANKING_WEIGHTS.rating;

    let boostApplied = false;
    let newBusinessBoost = false;
    let penaltyReason: string | undefined;

    // New business temporary boost (first 14 days)
    if (entity.isNewBusiness && entity.recencyDays <= 14) {
      score *= 1.15;
      newBusinessBoost = true;
    }

    // Paid boost
    if (isBoostActive(entity)) {
      const mult = BOOST_MULTIPLIERS[entity.boostTier!] ?? 1;
      score *= mult;
      boostApplied = true;
    }

    // Penalties
    if (entity.qualityScore < 40) {
      score *= 0.7;
      penaltyReason = "Low quality score";
    }
    if (entity.profileCompleteness < 0.3) {
      score *= 0.8;
      penaltyReason = (penaltyReason ? penaltyReason + "; " : "") + "Incomplete profile";
    }
    if (entity.mediaQuality < 30) {
      score *= 0.85;
      penaltyReason = (penaltyReason ? penaltyReason + "; " : "") + "Poor media quality";
    }

    return { id: entity.id, score: Math.min(1, Math.max(0, score)), boostApplied, newBusinessBoost, penaltyReason };
  });

  scored.sort((a, b) => b.score - a.score);

  return scored.map((s, idx) => ({ ...s, rank: idx + 1 }));
}
