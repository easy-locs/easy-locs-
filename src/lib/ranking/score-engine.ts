/**
 * Unified Score Engine — Reusable ranking layer for all universes.
 * Two models:
 *   1. Proximity-first: Food, Grocery, Services, Ride, Send
 *   2. Intent-first: Travel, Property
 */

export interface ScorableItem {
  id: string;
  // Proximity signals
  distanceKm?: number | null;
  etaMinutes?: number | null;
  // Quality signals
  rating?: number | null;
  reviewCount?: number | null;
  // Availability signals
  available?: boolean;
  openNow?: boolean;
  // Conversion signals
  orderCount?: number | null;
  conversionRate?: number | null;
  // Monetization
  boostTier?: string | null;
  boostUntil?: string | null;
  hasActiveOffer?: boolean;
  // Intent signals (Travel / Property)
  intentMatch?: number | null;   // 0-1 how well item matches user intent
  zoneRelevance?: number | null; // 0-1 geo zone match
  priceScore?: number | null;    // 0-1 how well price matches budget
  qualityScore?: number | null;  // 0-1 composite quality
  // CRM signals
  repeatCustomer?: boolean;
  isFavorite?: boolean;
  lastInteractionDays?: number | null;
  // Reliability
  reliabilityScore?: number | null; // 0-1
  // Generic
  createdAt?: string | null;
  [key: string]: any;
}

export type ScoringModel = "proximity" | "intent";

interface WeightProfile {
  distance: number;
  eta: number;
  availability: number;
  rating: number;
  reliability: number;
  offers: number;
  repeat: number;
  intent: number;
  zone: number;
  price: number;
  quality: number;
  conversion: number;
  preference: number;
  boost: number;
  recency: number;
}

const PROXIMITY_WEIGHTS: WeightProfile = {
  distance: 0.20,
  eta: 0.12,
  availability: 0.15,
  rating: 0.12,
  reliability: 0.08,
  offers: 0.06,
  repeat: 0.07,
  intent: 0,
  zone: 0,
  price: 0.02,
  quality: 0.03,
  conversion: 0.03,
  preference: 0.02,
  boost: 0.06,
  recency: 0.04,
};

const INTENT_WEIGHTS: WeightProfile = {
  distance: 0.02,
  eta: 0,
  availability: 0.10,
  rating: 0.08,
  reliability: 0.03,
  offers: 0.04,
  repeat: 0.05,
  intent: 0.18,
  zone: 0.12,
  price: 0.13,
  quality: 0.10,
  conversion: 0.06,
  preference: 0.05,
  boost: 0.04,
  recency: 0,
};

const BOOST_SCORES: Record<string, number> = { featured: 1, premium: 0.7, basic: 0.4 };

function normalize(value: number, max: number): number {
  return Math.min(1, Math.max(0, value / max));
}

function distanceScore(km: number | null | undefined): number {
  if (km == null) return 0.3; // unknown → neutral
  if (km <= 1) return 1;
  if (km <= 5) return 0.8;
  if (km <= 15) return 0.5;
  if (km <= 50) return 0.3;
  return 0.1;
}

function etaScore(min: number | null | undefined): number {
  if (min == null) return 0.3;
  if (min <= 10) return 1;
  if (min <= 20) return 0.8;
  if (min <= 40) return 0.5;
  return 0.2;
}

/**
 * Score a single item using the specified model.
 * Returns a value between 0 and 1.
 */
export function scoreItem(item: ScorableItem, model: ScoringModel): number {
  const w = model === "proximity" ? PROXIMITY_WEIGHTS : INTENT_WEIGHTS;

  const signals: Record<keyof WeightProfile, number> = {
    distance: distanceScore(item.distanceKm),
    eta: etaScore(item.etaMinutes),
    availability: (item.available !== false && item.openNow !== false) ? 1 : 0.1,
    rating: normalize(item.rating ?? 3, 5),
    reliability: item.reliabilityScore ?? 0.5,
    offers: item.hasActiveOffer ? 1 : 0,
    repeat: item.repeatCustomer ? 1 : (item.isFavorite ? 0.7 : 0),
    intent: item.intentMatch ?? 0.5,
    zone: item.zoneRelevance ?? 0.5,
    price: item.priceScore ?? 0.5,
    quality: item.qualityScore ?? normalize(item.rating ?? 3, 5),
    conversion: normalize(item.conversionRate ?? 0.05, 0.2),
    preference: (item.repeatCustomer || item.isFavorite) ? 0.8 : 0.3,
    boost: isBoostActive(item) ? (BOOST_SCORES[item.boostTier!] ?? 0.3) : 0,
    recency: recencySignal(item.createdAt),
  };

  let score = 0;
  for (const key of Object.keys(w) as (keyof WeightProfile)[]) {
    score += w[key] * signals[key];
  }

  return Math.min(1, Math.max(0, score));
}

/**
 * Rank a list of items using the specified scoring model.
 */
export function rankItems<T extends ScorableItem>(items: T[], model: ScoringModel): T[] {
  return [...items]
    .map(item => ({ item, score: scoreItem(item, model) }))
    .sort((a, b) => b.score - a.score)
    .map(({ item }) => item);
}

function isBoostActive(item: ScorableItem): boolean {
  if (!item.boostTier || !item.boostUntil) return false;
  return new Date(item.boostUntil) > new Date();
}

function recencySignal(createdAt: string | null | undefined): number {
  if (!createdAt) return 0.3;
  const ageDays = (Date.now() - new Date(createdAt).getTime()) / 86_400_000;
  if (ageDays <= 1) return 1;
  if (ageDays <= 7) return 0.8;
  if (ageDays <= 30) return 0.5;
  return 0.2;
}

/** Determine appropriate model for a universe */
export function getModelForUniverse(universe: string): ScoringModel {
  const intentUniverses = ["travel", "property"];
  return intentUniverses.includes(universe) ? "intent" : "proximity";
}
