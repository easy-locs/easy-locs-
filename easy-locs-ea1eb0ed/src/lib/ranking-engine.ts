/**
 * UNIFIED RANKING ENGINE — Future-Safe Universal Scoring
 * ======================================================
 * Ranks ANY entity type: businesses, offers, passes, bundles, subscriptions.
 * Uses a normalized signal system so new entity types plug in without refactoring.
 *
 * Architecture:
 *   RankableEntity (universal interface)
 *     → RankSignals (normalized 0–1 values)
 *       → weightedScore (configurable per context)
 *
 * Layers respected:
 *   1. Business Taxonomy — vertical/cluster/subcategory/tags
 *   2. System Capabilities — not mixed in (wallet, qr, etc. stay separate)
 *   3. Action Model — not mixed in (scan, pay, etc. stay separate)
 */

import { strictHierarchyMatchScore as hierarchyMatchScore } from "@/lib/taxonomy/world-class-taxonomy";

// ═══════════════════════════════════════════════════════════
//  UNIVERSAL RANKABLE ENTITY
// ═══════════════════════════════════════════════════════════

/** Every rankable thing implements this interface. */
export interface RankableEntity {
  id: string;
  entityType: EntityType;

  // Taxonomy position
  vertical?: string | null;
  cluster?: string | null;
  subcategory?: string | null;
  tags?: string[] | null;

  // Quality signals
  rating?: number | null;
  reviewCount?: number | null;
  orderCount?: number | null;

  // Geo
  lat?: number | null;
  lng?: number | null;
  districtCode?: string | null;

  // Time
  createdAt?: string | null;
  timeScore?: number | null;

  // Monetization
  boostTier?: string | null;
  boostUntil?: string | null;
  isSponsored?: boolean;
  partnerPriority?: number | null;

  // Profile completeness (0–1)
  profileScore?: number | null;

  // Text for search relevance
  title?: string;
  description?: string;

  // Future commercial signals (safe extensibility)
  offerScore?: number | null;
  subscriptionTier?: string | null;
  networkId?: string | null;
}

/**
 * Entity types the ranking engine can score.
 * Businesses today, commercial products tomorrow.
 */
export type EntityType =
  | "business"
  | "offer"
  | "subscription"
  | "pass"
  | "bundle"
  | "partner_network"
  | "category_plan";

// ═══════════════════════════════════════════════════════════
//  NORMALIZED RANK SIGNALS (0–1 each)
// ═══════════════════════════════════════════════════════════

export interface RankSignals {
  hierarchy: number;    // 0–1: exact sub=1, cluster=0.66, vertical=0.33, none=0
  proximity: number;    // 0–1: closer = higher
  rating: number;       // 0–1: rating/5
  popularity: number;   // 0–1: log-normalized reviews+orders
  time: number;         // 0–1: time-of-day relevance
  recency: number;      // 0–1: how new the entity is
  boost: number;        // 0–1: sponsorship/boost tier
  profile: number;      // 0–1: completeness of data
  searchRelevance: number; // 0–1: keyword match
  /** Future: offer/subscription relevance */
  commercial: number;   // 0–1: offer score, partner priority
}

// ═══════════════════════════════════════════════════════════
//  WEIGHT PROFILES (per context)
// ═══════════════════════════════════════════════════════════

export interface RankWeights {
  hierarchy: number;
  proximity: number;
  rating: number;
  popularity: number;
  time: number;
  recency: number;
  boost: number;
  profile: number;
  searchRelevance: number;
  commercial: number;
}

/** Default weights for discovery (radar/map/list) */
export const DISCOVERY_WEIGHTS: RankWeights = {
  hierarchy: 15,
  proximity: 25,
  rating: 18,
  popularity: 8,
  time: 12,
  recency: 0,
  boost: 10,
  profile: 12,
  searchRelevance: 0,
  commercial: 0,
};

/** Weights when user is searching */
export const SEARCH_WEIGHTS: RankWeights = {
  hierarchy: 10,
  proximity: 10,
  rating: 12,
  popularity: 5,
  time: 5,
  recency: 3,
  boost: 5,
  profile: 5,
  searchRelevance: 40,
  commercial: 5,
};

/** Weights for listing/marketplace views */
export const LISTING_WEIGHTS: RankWeights = {
  hierarchy: 5,
  proximity: 5,
  rating: 15,
  popularity: 15,
  time: 5,
  recency: 20,
  boost: 20,
  profile: 10,
  searchRelevance: 0,
  commercial: 5,
};

/** Future: weights for commercial/subscription views */
export const COMMERCIAL_WEIGHTS: RankWeights = {
  hierarchy: 20,
  proximity: 10,
  rating: 10,
  popularity: 5,
  time: 5,
  recency: 5,
  boost: 5,
  profile: 5,
  searchRelevance: 5,
  commercial: 30,
};

// ═══════════════════════════════════════════════════════════
//  SIGNAL COMPUTATION
// ═══════════════════════════════════════════════════════════

const BOOST_TIERS: Record<string, number> = {
  featured: 1.0,
  premium: 0.7,
  basic: 0.35,
};

export interface RankContext {
  /** Target subcategory for hierarchy scoring */
  targetSubcategory?: string | null;
  /** Target vertical for hierarchy scoring */
  targetVertical?: string | null;
  /** User location for proximity */
  userLat?: number | null;
  userLng?: number | null;
  /** User's current district for local relevance */
  userDistrictCode?: string | null;
  /** Search query for text relevance */
  searchQuery?: string | null;
}

import { haversineKm } from "@/lib/geo/distance";

/** Compute all normalized signals for an entity. */
export function computeSignals(entity: RankableEntity, ctx: RankContext = {}): RankSignals {
  // Hierarchy: 0–1 (uses canonical taxonomy)
  const rawHierarchy = hierarchyMatchScore(
    entity.subcategory, ctx.targetSubcategory, ctx.targetVertical
  );
  const hierarchy = rawHierarchy / 3; // normalize 0-3 → 0-1

  // Proximity: 0–1 (closer = higher, decays over ~15km)
  // District match provides a bonus for same-neighborhood relevance
  let proximity = 0;
  if (entity.lat != null && entity.lng != null && ctx.userLat != null && ctx.userLng != null) {
    const distKm = haversineKm(ctx.userLat, ctx.userLng, entity.lat, entity.lng);
    proximity = Math.max(0, 1 - distKm / 15);
  }
  // Same-district bonus: +0.15 when entity is in the user's district
  if (ctx.userDistrictCode && entity.districtCode && ctx.userDistrictCode === entity.districtCode) {
    proximity = Math.min(1, proximity + 0.15);
  }

  // Rating: 0–1
  const rating = Math.min(1, (entity.rating ?? 0) / 5);

  // Popularity: 0–1 (log-normalized)
  const totalActivity = (entity.reviewCount ?? 0) + (entity.orderCount ?? 0);
  const popularity = Math.min(1, Math.log2(totalActivity + 1) / 8);

  // Time: 0–1
  const time = entity.timeScore ?? 0;

  // Recency: 0–1 (decays over 60 days)
  let recency = 0.5; // neutral default
  if (entity.createdAt) {
    const ageDays = (Date.now() - new Date(entity.createdAt).getTime()) / 86_400_000;
    recency = Math.max(0, 1 - ageDays / 60);
  }

  // Boost: 0–1
  let boost = 0;
  if (entity.isSponsored) boost = 0.5;
  if (entity.boostTier && entity.boostUntil) {
    if (new Date(entity.boostUntil) > new Date()) {
      boost = BOOST_TIERS[entity.boostTier] ?? 0.35;
    }
  }

  // Profile completeness
  const profile = entity.profileScore ?? 0;

  // Search relevance: 0–1
  let searchRelevance = 0;
  if (ctx.searchQuery && ctx.searchQuery.length > 1) {
    const q = ctx.searchQuery.toLowerCase();
    const title = (entity.title ?? "").toLowerCase();
    const tags = (entity.tags ?? []).join(" ").toLowerCase();
    const desc = (entity.description ?? "").toLowerCase();
    if (title.includes(q)) searchRelevance += 0.6;
    if (tags.includes(q)) searchRelevance += 0.25;
    if (desc.includes(q)) searchRelevance += 0.15;
    searchRelevance = Math.min(1, searchRelevance);
  }

  // Commercial: 0–1 (future signals)
  let commercial = 0;
  if (entity.offerScore != null) commercial = Math.min(1, entity.offerScore);
  if (entity.partnerPriority != null) commercial = Math.max(commercial, Math.min(1, entity.partnerPriority / 100));

  return { hierarchy, proximity, rating, popularity, time, recency, boost, profile, searchRelevance, commercial };
}

// ═══════════════════════════════════════════════════════════
//  SCORING
// ═══════════════════════════════════════════════════════════

/** Compute weighted score (0–100) from signals and weights. */
export function weightedScore(signals: RankSignals, weights: RankWeights): number {
  return (
    signals.hierarchy * weights.hierarchy +
    signals.proximity * weights.proximity +
    signals.rating * weights.rating +
    signals.popularity * weights.popularity +
    signals.time * weights.time +
    signals.recency * weights.recency +
    signals.boost * weights.boost +
    signals.profile * weights.profile +
    signals.searchRelevance * weights.searchRelevance +
    signals.commercial * weights.commercial
  );
}

/** Score a single entity. */
export function scoreEntity(entity: RankableEntity, ctx: RankContext = {}, weights: RankWeights = DISCOVERY_WEIGHTS): number {
  return weightedScore(computeSignals(entity, ctx), weights);
}

/** Rank an array of entities by score (descending). */
export function rankEntities<T extends RankableEntity>(
  entities: T[],
  ctx: RankContext = {},
  weights: RankWeights = DISCOVERY_WEIGHTS
): T[] {
  return [...entities]
    .map((e) => ({ entity: e, score: scoreEntity(e, ctx, weights) }))
    .sort((a, b) => b.score - a.score)
    .map(({ entity }) => entity);
}

// ═══════════════════════════════════════════════════════════
//  BACKWARD COMPAT — old API still works
// ═══════════════════════════════════════════════════════════

export interface RankableItem {
  id: string;
  created_at?: string;
  boost_tier?: string | null;
  boost_until?: string | null;
  price?: number | null;
  rating?: number | null;
  review_count?: number | null;
  order_count?: number | null;
  tags?: string[] | null;
  title?: string;
  [key: string]: any;
}

/** Legacy scoring — wraps new engine with LISTING_WEIGHTS. */
export function scoreItem(item: RankableItem, config: { searchQuery?: string } = {}): number {
  const entity: RankableEntity = {
    id: item.id,
    entityType: "business",
    rating: item.rating,
    reviewCount: item.review_count,
    orderCount: item.order_count,
    tags: item.tags,
    title: item.title,
    createdAt: item.created_at,
    boostTier: item.boost_tier,
    boostUntil: item.boost_until,
  };
  return scoreEntity(entity, { searchQuery: config.searchQuery }, LISTING_WEIGHTS);
}

/** Legacy sort — wraps new engine. */
export function rankItems<T extends RankableItem>(items: T[], config: { searchQuery?: string } = {}): T[] {
  return [...items]
    .map((item) => ({ item, score: scoreItem(item, config) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

/** Check if an item has an active boost. */
export function isActiveBoosted(item: RankableItem): boolean {
  if (!item.boost_tier || !item.boost_until) return false;
  return new Date(item.boost_until) > new Date();
}
