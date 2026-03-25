/**
 * Vibe & Density Engine — Calculates zone atmosphere and crowd levels.
 * Privacy-first: uses only aggregated entity data, never individual tracking.
 */

export type VibeClassification = "calm" | "active" | "nightlife" | "business" | "family" | "luxury" | "trendy";

export interface VibeDensityResult {
  zoneId: string;
  vibe: VibeClassification;
  vibeScore: number; // 0-100
  crowdDensity: number; // 0-100  
  noiseLevel: "quiet" | "moderate" | "loud" | "very_loud";
  priceRange: "budget" | "mid" | "premium" | "luxury";
  familyFriendly: boolean;
  openNow: number; // count
  totalPlaces: number;
  tags: string[];
}

interface EntityInput {
  category: string;
  rating?: number;
  reviewsCount?: number;
  priceLevel?: number; // 1-4
}

/** Compute vibe and density from entity data */
export function computeVibeDensity(
  zoneId: string,
  entities: EntityInput[],
  hour?: number
): VibeDensityResult {
  const h = hour ?? new Date().getHours();
  const total = entities.length;

  // Category counts
  const cats: Record<string, number> = {};
  entities.forEach(e => { cats[e.category] = (cats[e.category] || 0) + 1; });

  // Classify vibe
  const nightlifeCount = (cats.bar || 0) + (cats.club || 0) + (cats.lounge || 0) + (cats.nightclub || 0);
  const foodCount = (cats.restaurant || 0) + (cats.cafe || 0) + (cats.bakery || 0) + (cats.food || 0);
  const luxuryCount = (cats.hotel || 0) + (cats.resort || 0) + (cats.spa || 0);
  const familyCount = (cats.park || 0) + (cats.playground || 0) + (cats.school || 0);
  const businessCount = (cats.office || 0) + (cats.coworking || 0);

  let vibe: VibeClassification = "calm";
  let vibeScore = 30;

  if (nightlifeCount > total * 0.3 && h >= 20) {
    vibe = "nightlife"; vibeScore = 85;
  } else if (luxuryCount > total * 0.25) {
    vibe = "luxury"; vibeScore = 75;
  } else if (businessCount > total * 0.3 && h >= 9 && h <= 18) {
    vibe = "business"; vibeScore = 60;
  } else if (familyCount > total * 0.2) {
    vibe = "family"; vibeScore = 55;
  } else if (foodCount > total * 0.4) {
    vibe = "active"; vibeScore = 70;
  } else if (total > 15) {
    vibe = "trendy"; vibeScore = 65;
  }

  // Crowd density based on time and entity count
  let density = Math.min(100, total * 4);
  if (h >= 12 && h <= 14) density = Math.min(100, density * 1.3);
  if (h >= 19 && h <= 22) density = Math.min(100, density * 1.4);
  if (h >= 2 && h <= 6) density = Math.max(5, density * 0.3);

  // Noise level
  const noiseLevel = nightlifeCount > 3 && h >= 21 ? "very_loud" :
    density > 70 ? "loud" : density > 40 ? "moderate" : "quiet";

  // Price range
  const avgPrice = entities.reduce((sum, e) => sum + (e.priceLevel ?? 2), 0) / Math.max(1, total);
  const priceRange = avgPrice >= 3.5 ? "luxury" : avgPrice >= 2.5 ? "premium" : avgPrice >= 1.5 ? "mid" : "budget";

  // Tags
  const tags: string[] = [];
  if (vibe === "nightlife") tags.push("🌙 Nightlife zone");
  if (vibe === "luxury") tags.push("✨ Premium area");
  if (foodCount > 5) tags.push("🍽️ Food hub");
  if (familyCount > 2) tags.push("👨‍👩‍👧 Family friendly");
  if (density > 70) tags.push("🔥 Busy now");
  if (density < 20) tags.push("🧘 Quiet area");

  return {
    zoneId,
    vibe,
    vibeScore: Math.round(vibeScore),
    crowdDensity: Math.round(density),
    noiseLevel,
    priceRange,
    familyFriendly: familyCount > 0 || (nightlifeCount === 0 && h < 20),
    openNow: Math.round(total * (h >= 9 && h <= 22 ? 0.8 : 0.3)),
    totalPlaces: total,
    tags,
  };
}
