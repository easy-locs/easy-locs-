import { platformBus } from "@/lib/shared/platform-bus";

export type RankingFactor = "relevance" | "distance" | "rating" | "trust" | "freshness" | "price" | "popularity" | "personalization";
export type SearchScope = "all" | "food" | "hotel" | "services" | "retail" | "property" | "marketplace" | "events";

export interface SearchQuery {
  text: string;
  scope: SearchScope;
  filters: Record<string, unknown>;
  location: { lat: number; lng: number } | null;
  radiusKm: number | null;
  sortBy: RankingFactor;
  page: number;
  pageSize: number;
  userId: string | null;
}

export interface SearchResult {
  id: string;
  type: string;
  title: string;
  description: string | null;
  score: number;
  distance: number | null;
  rating: number | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  vertical: string;
  matchedTokens: string[];
}

export interface RankingWeights {
  relevance: number;
  distance: number;
  rating: number;
  trust: number;
  freshness: number;
  price: number;
  popularity: number;
  personalization: number;
}

export const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
  relevance: 0.30,
  distance: 0.25,
  rating: 0.15,
  trust: 0.10,
  freshness: 0.08,
  price: 0.05,
  popularity: 0.04,
  personalization: 0.03,
};

export interface UserBehaviorSignal {
  userId: string;
  verticalPreferences: Record<string, number>;
  priceRangePreference: { min: number; max: number } | null;
  recentSearches: string[];
  recentViews: string[];
  purchaseHistory: string[];
}

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/)
    .filter((t) => t.length > 1);
}

export function calculateRelevanceScore(queryTokens: string[], documentTokens: string[]): number {
  if (queryTokens.length === 0 || documentTokens.length === 0) return 0;
  const docSet = new Set(documentTokens);
  let matches = 0;
  for (const token of queryTokens) {
    if (docSet.has(token)) matches++;
    else {
      for (const dt of docSet) {
        if (dt.includes(token) || token.includes(dt)) {
          matches += 0.5;
          break;
        }
      }
    }
  }
  return matches / queryTokens.length;
}

export function calculateDistanceScore(distanceKm: number | null, maxRadiusKm: number): number {
  if (distanceKm === null) return 0.5;
  if (distanceKm <= 0) return 1;
  return Math.max(0, 1 - distanceKm / maxRadiusKm);
}

export function calculateFreshnessScore(updatedAt: number): number {
  const ageHours = (Date.now() - updatedAt) / 3600000;
  if (ageHours <= 1) return 1;
  if (ageHours <= 24) return 0.9;
  if (ageHours <= 168) return 0.7;
  if (ageHours <= 720) return 0.5;
  return 0.3;
}

export function calculateTrustScore(
  rating: number | null,
  reviewCount: number,
  completedTransactions: number,
  accountAgeMonths: number
): number {
  const ratingFactor = rating ? (rating / 5) * 0.4 : 0.2;
  const reviewFactor = Math.min(reviewCount / 100, 1) * 0.2;
  const txFactor = Math.min(completedTransactions / 50, 1) * 0.2;
  const ageFactor = Math.min(accountAgeMonths / 12, 1) * 0.2;
  return ratingFactor + reviewFactor + txFactor + ageFactor;
}

export function computeCompositeScore(
  scores: Partial<Record<RankingFactor, number>>,
  weights: RankingWeights = DEFAULT_RANKING_WEIGHTS
): number {
  let total = 0;
  let weightSum = 0;
  for (const [factor, weight] of Object.entries(weights)) {
    const score = scores[factor as RankingFactor];
    if (score !== undefined) {
      total += score * weight;
      weightSum += weight;
    }
  }
  return weightSum > 0 ? total / weightSum : 0;
}

export function personalizeWeights(behavior: UserBehaviorSignal, base: RankingWeights): RankingWeights {
  const weights = { ...base };
  if (behavior.recentSearches.length > 10) weights.personalization *= 1.5;
  if (behavior.purchaseHistory.length > 5) weights.personalization *= 1.3;
  const totalWeight = Object.values(weights).reduce((sum, w) => sum + w, 0);
  for (const key of Object.keys(weights) as RankingFactor[]) {
    weights[key] /= totalWeight;
  }
  return weights;
}

export function emitSearchPerformed(query: SearchQuery, resultCount: number): void {
  platformBus.emit("USER_SEARCH", {
    query: query.text,
    scope: query.scope,
    filters: query.filters,
    resultCount,
    userId: query.userId,
    timestamp: Date.now(),
  }, "search-engine");
}

export function generateCrossVerticalSuggestions(
  currentVertical: string,
  userBehavior: UserBehaviorSignal
): string[] {
  const allVerticals = ["food", "hotel", "services", "retail", "property", "marketplace", "events"];
  return allVerticals
    .filter((v) => v !== currentVertical)
    .sort((a, b) => (userBehavior.verticalPreferences[b] ?? 0) - (userBehavior.verticalPreferences[a] ?? 0))
    .slice(0, 3);
}
