import type { RankableEntity, RankContext, RankWeights, RankSignals } from "@/lib/ranking-engine";
import { computeSignals, weightedScore } from "@/lib/ranking-engine";
import type { RadarVertical } from "./radar-result-item";

export interface RadarScoreBreakdown {
  total: number;
  textRelevance: number;
  geoDistance: number;
  availability: number;
  quality: number;
  popularity: number;
  conversionLikelihood: number;
  preferenceMatch: number;
  freshness: number;
  trust: number;
  penalties: number;
  boosts: number;
}

export interface RadarScoringContext extends RankContext {
  vertical?: RadarVertical;
  timeOfDay?: number;
  dayOfWeek?: number;
  urgency?: "low" | "medium" | "high";
  userPreferences?: {
    favoriteVerticals?: string[];
    frequentZones?: string[];
    pricePreference?: "budget" | "mid" | "premium" | "luxury";
    recentSearches?: string[];
  };
}

const VERTICAL_WEIGHTS: Record<RadarVertical, RankWeights> = {
  food: {
    hierarchy: 10, proximity: 28, rating: 20, popularity: 10,
    time: 15, recency: 2, boost: 5, profile: 8, searchRelevance: 0, commercial: 2,
  },
  services: {
    hierarchy: 12, proximity: 22, rating: 18, popularity: 5,
    time: 15, recency: 5, boost: 5, profile: 15, searchRelevance: 0, commercial: 3,
  },
  hotel: {
    hierarchy: 8, proximity: 15, rating: 22, popularity: 8,
    time: 5, recency: 5, boost: 8, profile: 18, searchRelevance: 0, commercial: 11,
  },
  property: {
    hierarchy: 8, proximity: 12, rating: 10, popularity: 5,
    time: 3, recency: 20, boost: 5, profile: 20, searchRelevance: 0, commercial: 17,
  },
  taxi: {
    hierarchy: 5, proximity: 35, rating: 12, popularity: 5,
    time: 18, recency: 0, boost: 5, profile: 5, searchRelevance: 0, commercial: 15,
  },
  shops: {
    hierarchy: 10, proximity: 25, rating: 18, popularity: 12,
    time: 10, recency: 5, boost: 8, profile: 10, searchRelevance: 0, commercial: 2,
  },
  healthcare: {
    hierarchy: 10, proximity: 25, rating: 20, popularity: 5,
    time: 15, recency: 3, boost: 5, profile: 15, searchRelevance: 0, commercial: 2,
  },
  nightlife: {
    hierarchy: 8, proximity: 20, rating: 18, popularity: 15,
    time: 20, recency: 5, boost: 5, profile: 7, searchRelevance: 0, commercial: 2,
  },
  grocery: {
    hierarchy: 8, proximity: 30, rating: 15, popularity: 10,
    time: 12, recency: 3, boost: 5, profile: 12, searchRelevance: 0, commercial: 5,
  },
};

export function getVerticalWeights(vertical: RadarVertical | undefined): RankWeights {
  return vertical ? (VERTICAL_WEIGHTS[vertical] ?? VERTICAL_WEIGHTS.shops) : VERTICAL_WEIGHTS.shops;
}

export interface RadarScorableEntity extends RankableEntity {
  availabilityStatus?: "open" | "closed" | "available" | "unavailable" | "busy" | null;
  priceLevel?: number | null;
  hasImage?: boolean;
  hasAddress?: boolean;
  hasCategoryMatch?: boolean;
  hasDescription?: boolean;
  hasPrice?: boolean;
  responseRate?: number | null;
  conversionRate?: number | null;
  cancellationRate?: number | null;
  orbitInteractions?: number | null;
  walletPayments?: number | null;
}

function computeAvailabilitySignal(status?: string | null): number {
  if (!status) return 0.5;
  switch (status) {
    case "open": case "available": return 1.0;
    case "busy": return 0.6;
    case "closed": case "unavailable": return 0.1;
    default: return 0.5;
  }
}

function computeQualitySignal(entity: RadarScorableEntity): number {
  let score = 0;
  let factors = 0;
  if (entity.hasImage !== false) { score += 0.25; } factors += 0.25;
  if (entity.hasAddress !== false) { score += 0.2; } factors += 0.2;
  if (entity.hasCategoryMatch !== false) { score += 0.15; } factors += 0.15;
  if (entity.hasDescription !== false) { score += 0.15; } factors += 0.15;
  if (entity.hasPrice !== false) { score += 0.1; } factors += 0.1;
  if ((entity.rating ?? 0) > 0) { score += 0.15; } factors += 0.15;
  return factors > 0 ? score / factors : 0.5;
}

function computeTrustSignal(entity: RadarScorableEntity): number {
  let trust = 0.5;
  if (entity.responseRate != null) trust += (entity.responseRate - 0.5) * 0.2;
  if (entity.cancellationRate != null) trust -= entity.cancellationRate * 0.3;
  if ((entity.reviewCount ?? 0) > 10) trust += 0.1;
  if ((entity.walletPayments ?? 0) > 0) trust += 0.05;
  if ((entity.orbitInteractions ?? 0) > 0) trust += 0.05;
  return Math.max(0, Math.min(1, trust));
}

function computePreferenceSignal(entity: RadarScorableEntity, ctx: RadarScoringContext): number {
  if (!ctx.userPreferences) return 0.5;
  let score = 0.5;
  const prefs = ctx.userPreferences;
  if (prefs.favoriteVerticals?.includes(entity.vertical ?? "")) score += 0.15;
  if (prefs.frequentZones?.includes(entity.districtCode ?? "")) score += 0.1;
  return Math.min(1, score);
}

function computeConversionSignal(entity: RadarScorableEntity): number {
  let signal = 0.3;
  if (entity.conversionRate != null) signal = entity.conversionRate;
  else {
    if ((entity.rating ?? 0) >= 4.5) signal += 0.15;
    if ((entity.reviewCount ?? 0) > 50) signal += 0.1;
    if (entity.hasImage !== false) signal += 0.1;
    if (entity.profileScore != null && entity.profileScore > 0.7) signal += 0.1;
  }
  return Math.min(1, signal);
}

export function computeRadarScore(
  entity: RadarScorableEntity,
  ctx: RadarScoringContext = {}
): RadarScoreBreakdown {
  const weights = getVerticalWeights(ctx.vertical);
  const baseSignals: RankSignals = computeSignals(entity, ctx);
  const availability = computeAvailabilitySignal(entity.availabilityStatus);
  const quality = computeQualitySignal(entity);
  const trust = computeTrustSignal(entity);
  const preference = computePreferenceSignal(entity, ctx);
  const conversion = computeConversionSignal(entity);

  let penalties = 0;
  if (entity.availabilityStatus === "closed" || entity.availabilityStatus === "unavailable") penalties += 15;
  if (quality < 0.3) penalties += 10;
  if (trust < 0.3) penalties += 8;
  if (entity.profileScore != null && entity.profileScore < 0.2) penalties += 5;

  let boosts = 0;
  if (quality > 0.8 && (entity.rating ?? 0) >= 4.5) boosts += 5;
  if (availability === 1 && baseSignals.proximity > 0.7) boosts += 3;
  if (trust > 0.8) boosts += 2;

  const base = weightedScore(baseSignals, weights);
  const extendedSignals = (availability * 8) + (quality * 7) + (trust * 5) + (preference * 5) + (conversion * 5);
  const total = Math.max(0, Math.min(100, base + extendedSignals + boosts - penalties));

  return {
    total,
    textRelevance: baseSignals.searchRelevance,
    geoDistance: baseSignals.proximity,
    availability,
    quality,
    popularity: baseSignals.popularity,
    conversionLikelihood: conversion,
    preferenceMatch: preference,
    freshness: baseSignals.recency,
    trust,
    penalties,
    boosts,
  };
}

export function diversifyResults<T extends { type?: string; subcategory?: string | null; district?: string | null }>(
  items: T[],
  maxConsecutiveSameType: number = 3
): T[] {
  if (items.length <= maxConsecutiveSameType) return items;
  const result: T[] = [];
  const remaining = [...items];
  let consecutiveType = "";
  let consecutiveCount = 0;

  while (remaining.length > 0) {
    let picked = false;
    for (let i = 0; i < remaining.length; i++) {
      const item = remaining[i];
      const itemType = item.type ?? item.subcategory ?? "";
      if (consecutiveCount >= maxConsecutiveSameType && itemType === consecutiveType) continue;
      result.push(item);
      remaining.splice(i, 1);
      if (itemType === consecutiveType) {
        consecutiveCount++;
      } else {
        consecutiveType = itemType;
        consecutiveCount = 1;
      }
      picked = true;
      break;
    }
    if (!picked) {
      result.push(remaining.shift()!);
      consecutiveCount = 1;
    }
  }
  return result;
}
