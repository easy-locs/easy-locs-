/**
 * CENTRAL RANKING ENGINE — Single source of truth for all entity ranking.
 * Every surface (home, search, radar, hubs, boost, onboarding) MUST use this.
 */

export type EntityVertical =
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "healthcare"
  | "property"
  | "travel";

export type VisibilityClass =
  | "hidden"
  | "indexed_not_public"
  | "public_seed"
  | "ready_for_claim"
  | "priority_public"
  | "boost_ready";

export interface RankingInput {
  entityId: string;
  entityType: "candidate" | "seed" | "merchant";
  vertical: EntityVertical;
  dataQualityScore: number;
  menuQualityScore: number;
  visualQualityScore: number;
  geoConfidenceScore: number;
  taxonomyConfidenceScore: number;
  dedupRiskScore: number;
  reputationScore: number;
  conversionScore: number;
  claimReadinessScore: number;
  boostReadinessScore: number;
  freshnessScore: number;
  aiRecommendationScore?: number;
  hasGeo: boolean;
  hasCover: boolean;
  hasLogo: boolean;
  hasMenu: boolean;
  hasPrices: boolean;
}

export interface RankingResult {
  globalRankScore: number;
  visibilityClass: VisibilityClass;
  claimReady: boolean;
  boostReady: boolean;
  penalties: string[];
  reasons: Record<string, unknown>;
}

// ── Weight profiles per vertical ────────────────────────────

interface WeightProfile {
  data: number;
  menu: number;
  visual: number;
  geo: number;
  taxonomy: number;
  reputation: number;
  conversion: number;
  claim: number;
  boost: number;
  freshness: number;
}

const DEFAULT_WEIGHTS: WeightProfile = {
  data: 0.16,
  menu: 0.16,
  visual: 0.10,
  geo: 0.10,
  taxonomy: 0.10,
  reputation: 0.08,
  conversion: 0.12,
  claim: 0.08,
  boost: 0.05,
  freshness: 0.05,
};

const VERTICAL_WEIGHTS: Partial<Record<EntityVertical, WeightProfile>> = {
  food: {
    data: 0.14,
    menu: 0.22,
    visual: 0.12,
    geo: 0.10,
    taxonomy: 0.10,
    reputation: 0.08,
    conversion: 0.14,
    claim: 0.05,
    boost: 0.03,
    freshness: 0.02,
  },
  healthcare: {
    data: 0.18,
    menu: 0.02,
    visual: 0.08,
    geo: 0.18,
    taxonomy: 0.16,
    reputation: 0.14,
    conversion: 0.08,
    claim: 0.08,
    boost: 0.04,
    freshness: 0.04,
  },
  property: {
    data: 0.18,
    menu: 0.02,
    visual: 0.14,
    geo: 0.14,
    taxonomy: 0.10,
    reputation: 0.10,
    conversion: 0.14,
    claim: 0.08,
    boost: 0.06,
    freshness: 0.04,
  },
  travel: {
    data: 0.14,
    menu: 0.04,
    visual: 0.18,
    geo: 0.12,
    taxonomy: 0.08,
    reputation: 0.14,
    conversion: 0.14,
    claim: 0.06,
    boost: 0.06,
    freshness: 0.04,
  },
};

// ── Helpers ─────────────────────────────────────────────────

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function getWeights(vertical: EntityVertical): WeightProfile {
  return VERTICAL_WEIGHTS[vertical] ?? DEFAULT_WEIGHTS;
}

// ── Core computation ────────────────────────────────────────

export function computeCentralRank(input: RankingInput): RankingResult {
  const w = getWeights(input.vertical);
  const penalties: string[] = [];
  let penalty = 0;

  // Strong penalties
  if (input.dedupRiskScore >= 90) {
    penalty += 35;
    penalties.push("high_duplicate_risk");
  }
  if (!input.hasGeo) {
    // Lighter penalty for seeds — they often lack coordinates
    const geoPenalty = input.entityType === "merchant" ? 20 : 10;
    penalty += geoPenalty;
    penalties.push("missing_geo");
  }
  if (input.entityType === "merchant") {
    if (input.vertical === "food" && !input.hasMenu) {
      penalty += 25;
      penalties.push("missing_menu_food");
    }
    if (input.vertical === "food" && !input.hasPrices) {
      penalty += 20;
      penalties.push("missing_prices_food");
    }
  } else {
    // Seeds: very light menu penalty — they're pre-claim
    if (input.vertical === "food" && !input.hasMenu) {
      penalty += 5;
      penalties.push("seed_no_menu");
    }
  }
  if (!input.hasCover) {
    const coverPenalty = input.entityType === "merchant" ? 10 : 5;
    penalty += coverPenalty;
    penalties.push("missing_cover");
  }
  if (!input.hasLogo) {
    const logoPenalty = input.entityType === "merchant" ? 6 : 3;
    penalty += logoPenalty;
    penalties.push("missing_logo");
  }
  if (input.taxonomyConfidenceScore < 40) {
    penalty += 15;
    penalties.push("weak_taxonomy");
  }

  // Weighted score
  const baseRaw =
    input.dataQualityScore * w.data +
    input.menuQualityScore * w.menu +
    input.visualQualityScore * w.visual +
    input.geoConfidenceScore * w.geo +
    input.taxonomyConfidenceScore * w.taxonomy +
    input.reputationScore * w.reputation +
    input.conversionScore * w.conversion +
    input.claimReadinessScore * w.claim +
    input.boostReadinessScore * w.boost +
    input.freshnessScore * w.freshness;

  // AI recommendation boost (up to 10% influence)
  const aiBoost = (input.aiRecommendationScore ?? 0) * 0.1;
  const raw = baseRaw + aiBoost - penalty;

  const globalRankScore = clamp(raw);

  // Visibility class
  let visibilityClass: VisibilityClass = "hidden";
  if (globalRankScore >= 90) visibilityClass = "boost_ready";
  else if (globalRankScore >= 78) visibilityClass = "priority_public";
  else if (globalRankScore >= 65) visibilityClass = "ready_for_claim";
  else if (globalRankScore >= 45) visibilityClass = "public_seed";
  else if (globalRankScore >= 25) visibilityClass = "indexed_not_public";

  // Readiness gates
  const claimReady =
    globalRankScore >= 70 &&
    input.dataQualityScore >= 60 &&
    input.taxonomyConfidenceScore >= 60 &&
    input.geoConfidenceScore >= 60;

  const boostReady =
    globalRankScore >= 85 &&
    input.visualQualityScore >= 70 &&
    input.conversionScore >= 70;

  return {
    globalRankScore,
    visibilityClass,
    claimReady,
    boostReady,
    penalties,
    reasons: {
      vertical: input.vertical,
      weights: w,
      rawBeforePenalty: clamp(raw + penalty),
      totalPenalty: penalty,
    },
  };
}

// ── Utility: build RankingInput from raw shop data ──────────

export function buildRankingInputFromCandidate(c: Record<string, any>): RankingInput {
  const completeness = c.reason_json?.completeness ?? c.completeness ?? {};
  return {
    entityId: c.id,
    entityType: "candidate",
    vertical: c.canonical_vertical || "food",
    dataQualityScore: c.quality_score ?? 0,
    menuQualityScore: completeness.menu ?? 0,
    visualQualityScore: completeness.media ?? 0,
    geoConfidenceScore: completeness.geo ?? 0,
    taxonomyConfidenceScore: completeness.taxonomy ?? 0,
    dedupRiskScore: c.duplicate_group_id ? 95 : 0,
    reputationScore: Math.min(100, ((c.rating ?? 0) / 5) * 100),
    conversionScore: Math.min(100, (c.quality_score ?? 0) * 0.8),
    claimReadinessScore: completeness.overall ?? 0,
    boostReadinessScore: Math.min(100, ((c.rating ?? 0) / 5) * 100),
    freshnessScore: 80,
    hasGeo: !!(c.latitude && c.longitude),
    hasCover: !!(c.cover_url || c.photo_url),
    hasLogo: !!c.logo_url,
    hasMenu: (completeness.menu ?? 0) > 0,
    hasPrices: (completeness.menu ?? 0) >= 40,
  };
}

export function buildRankingInputFromSeed(s: Record<string, any>): RankingInput {
  const hasLogo = !!(s.logo_image || s.logo_url);
  const hasCover = !!(s.cover_image || s.cover_url);
  const hasGeo = !!(s.latitude && s.longitude);
  const hasSub = !!(s.subcategory && s.subcategory !== '');
  const hasRating = (s.rating ?? 0) > 0;
  const reviewCount = s.review_count ?? 0;

  // Better data quality estimation from available fields
  let dataScore = 30;
  if (s.name) dataScore += 10;
  if (hasSub) dataScore += 10;
  if (s.support_phone || s.support_email) dataScore += 10;
  if (s.opening_hours) dataScore += 10;
  if (s.area || s.city) dataScore += 10;
  if (hasRating) dataScore += 10;
  dataScore = Math.min(100, dataScore);

  const reputationScore = hasRating
    ? Math.min(100, (s.rating / 5) * 80 + Math.min(20, reviewCount / 5))
    : 20;

  return {
    entityId: s.id,
    entityType: "seed",
    vertical: s.category || "food",
    dataQualityScore: dataScore,
    menuQualityScore: 20, // seeds rarely have structured menus
    visualQualityScore: hasCover ? (hasLogo ? 70 : 50) : (hasLogo ? 30 : 10),
    geoConfidenceScore: hasGeo ? 80 : (s.area ? 40 : 0),
    taxonomyConfidenceScore: hasSub ? 70 : (s.category ? 40 : 10),
    dedupRiskScore: s.duplicate_of ? 95 : (s.duplicate_confidence ?? 0),
    reputationScore,
    conversionScore: Math.min(100, dataScore * 0.6 + reputationScore * 0.4),
    claimReadinessScore: s.display_priority ?? 40,
    boostReadinessScore: reputationScore,
    freshnessScore: 70,
    hasGeo,
    hasCover,
    hasLogo,
    hasMenu: false, // seeds don't have structured menus by default
    hasPrices: false,
  };
}
