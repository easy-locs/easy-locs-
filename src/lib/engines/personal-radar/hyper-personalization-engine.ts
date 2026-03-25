/**
 * Hyper Personalization Engine — Fuses profile, context, taste, budget, vibe
 * into a single personal_relevance_score per entity.
 */
import type { UserRadarProfile } from "./personal-profile-engine";
import type { UserContext } from "./context-awareness-engine";

export interface PersonalizedEntity {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating?: number;
  imageUrl?: string;
  personalScore: number; // 0-100
  matchReasons: string[];
}

interface ScoringInput {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  lat: number;
  lng: number;
  distanceKm: number;
  rating?: number;
  imageUrl?: string;
  price?: number;
}

/** Compute personal relevance score for each entity */
export function personalizeEntities(
  entities: ScoringInput[],
  profile: UserRadarProfile | null,
  context: UserContext,
): PersonalizedEntity[] {
  return entities.map(e => {
    let score = 50; // Base
    const reasons: string[] = [];

    // 1. Proximity (0-25 pts, closer = higher)
    const proxScore = Math.max(0, 25 - (e.distanceKm * 5));
    score += proxScore;
    if (e.distanceKm < 0.5) reasons.push("Very close");

    // 2. Quality (0-15 pts)
    if (e.rating) {
      score += Math.min(15, (e.rating / 5) * 15);
      if (e.rating >= 4.5) reasons.push("Top rated");
    }

    // 3. Taste affinity (0-20 pts)
    if (profile) {
      const catScore = profile.tasteScores[e.category] || 0;
      const subScore = e.subcategory ? (profile.tasteScores[e.subcategory] || 0) : 0;
      const affinityPts = Math.min(20, ((catScore + subScore) / 200) * 20);
      score += affinityPts;
      if (affinityPts > 10) reasons.push("Matches your taste");

      // Category preference
      if (profile.preferredCategories.includes(e.category) ||
          (e.subcategory && profile.preferredCategories.includes(e.subcategory))) {
        score += 5;
        reasons.push("Your favorite type");
      }
    }

    // 4. Time relevance (0-10 pts)
    const timeRelevant = isTimeRelevant(e.category, context.dayPart);
    if (timeRelevant) {
      score += 10;
      reasons.push("Perfect timing");
    }

    // 5. Budget fit (0-10 pts)
    if (profile && e.price) {
      const budgetFit = computeBudgetFit(e.price, profile.budgetProfile);
      score += budgetFit * 10;
      if (budgetFit > 0.7) reasons.push("Fits your budget");
    }

    // 6. Zone context (0-5 pts)
    if (context.zoneType === "airport" && ["hotel", "taxi", "exchange"].includes(e.category)) {
      score += 5;
      reasons.push("Airport essential");
    }

    // Normalize
    score = Math.min(100, Math.max(0, Math.round(score)));

    return {
      id: e.id,
      name: e.name,
      category: e.category,
      subcategory: e.subcategory,
      lat: e.lat,
      lng: e.lng,
      distanceKm: e.distanceKm,
      rating: e.rating,
      imageUrl: e.imageUrl,
      personalScore: score,
      matchReasons: reasons,
    };
  }).sort((a, b) => b.personalScore - a.personalScore);
}

function isTimeRelevant(category: string, dayPart: string): boolean {
  const map: Record<string, string[]> = {
    early_morning: ["cafe", "coffee", "bakery"],
    morning: ["cafe", "coffee", "bakery", "breakfast"],
    lunch: ["restaurant", "fast_food", "food", "cafe"],
    afternoon: ["cafe", "shop", "market", "dessert"],
    evening: ["restaurant", "bar", "lounge", "fine_dining"],
    night: ["bar", "club", "lounge", "nightclub"],
    late_night: ["fast_food", "kebab", "shawarma", "24h"],
  };
  return (map[dayPart] || []).includes(category);
}

function computeBudgetFit(price: number, budget: string): number {
  const ranges: Record<string, [number, number]> = {
    budget: [0, 30],
    mid: [10, 80],
    premium: [40, 200],
    luxury: [100, 9999],
    mixed: [0, 9999],
  };
  const [min, max] = ranges[budget] || [0, 9999];
  if (price >= min && price <= max) return 1;
  if (price < min) return 0.7;
  return Math.max(0, 1 - (price - max) / max);
}
