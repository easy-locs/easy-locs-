/**
 * Vibe & Density Engine — Calculates zone atmosphere and crowd levels.
 * Privacy-first: uses only aggregated entity data, never individual tracking.
 * V2: weighted classification, seasonal multipliers, richer tagging, result caching.
 */

export type VibeClassification = "calm" | "active" | "nightlife" | "business" | "family" | "luxury" | "trendy" | "cultural";

export interface VibeDensityResult {
  zoneId: string;
  vibe: VibeClassification;
  vibeScore: number;
  crowdDensity: number;
  noiseLevel: "quiet" | "moderate" | "loud" | "very_loud";
  priceRange: "budget" | "mid" | "premium" | "luxury";
  familyFriendly: boolean;
  openNow: number;
  totalPlaces: number;
  tags: string[];
  vibeEmoji: string;
  vibeLabel: string;
  peakStatus: "off_peak" | "building" | "peak" | "winding_down";
}

interface EntityInput {
  category: string;
  rating?: number;
  reviewsCount?: number;
  priceLevel?: number;
}

const VIBE_META: Record<VibeClassification, { emoji: string; label: string }> = {
  calm: { emoji: "🧘", label: "Calm & Peaceful" },
  active: { emoji: "⚡", label: "Active & Lively" },
  nightlife: { emoji: "🌙", label: "Nightlife Hub" },
  business: { emoji: "💼", label: "Business District" },
  family: { emoji: "👨‍👩‍👧", label: "Family Friendly" },
  luxury: { emoji: "✨", label: "Premium Zone" },
  trendy: { emoji: "🔥", label: "Trending Area" },
  cultural: { emoji: "🎭", label: "Cultural Quarter" },
};

let _cache: Map<string, { result: VibeDensityResult; ts: number }> = new Map();
const CACHE_TTL = 60_000;

function getCacheKey(zoneId: string, entities: EntityInput[], hour: number): string {
  const ids = entities.slice(0, 20).map(e => e.id ?? e.category ?? "").join(",");
  const catSig = entities.slice(0, 30).map(e => e.category?.[0] ?? "").join("");
  return `${zoneId}:${entities.length}:${hour}:${ids}:${catSig}`;
}

function getPeakStatus(h: number): VibeDensityResult["peakStatus"] {
  if ((h >= 11 && h <= 13) || (h >= 19 && h <= 21)) return "peak";
  if ((h >= 10 && h < 11) || (h >= 17 && h < 19)) return "building";
  if ((h >= 14 && h <= 16) || (h >= 22 && h <= 23)) return "winding_down";
  return "off_peak";
}

export function computeVibeDensity(
  zoneId: string,
  entities: EntityInput[],
  hour?: number
): VibeDensityResult {
  const h = hour ?? new Date().getHours();
  const total = entities.length;

  const cacheKey = getCacheKey(zoneId, entities, h);
  const cached = _cache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.result;

  const cats: Record<string, number> = {};
  let totalRating = 0;
  let ratedCount = 0;
  entities.forEach(e => {
    cats[e.category] = (cats[e.category] || 0) + 1;
    if (e.rating) { totalRating += e.rating; ratedCount++; }
  });

  const avgRating = ratedCount > 0 ? totalRating / ratedCount : 3;

  const nightlifeCount = (cats.bar || 0) + (cats.club || 0) + (cats.lounge || 0) + (cats.nightclub || 0) + (cats.pub || 0);
  const foodCount = (cats.restaurant || 0) + (cats.cafe || 0) + (cats.bakery || 0) + (cats.food || 0) + (cats.bistro || 0);
  const luxuryCount = (cats.hotel || 0) + (cats.resort || 0) + (cats.spa || 0) + (cats.villa || 0);
  const familyCount = (cats.park || 0) + (cats.playground || 0) + (cats.school || 0) + (cats.library || 0);
  const businessCount = (cats.office || 0) + (cats.coworking || 0) + (cats.bank || 0);
  const culturalCount = (cats.museum || 0) + (cats.gallery || 0) + (cats.theater || 0) + (cats.monument || 0);

  let vibe: VibeClassification = "calm";
  let vibeScore = 30;

  if (nightlifeCount > total * 0.3 && h >= 20) {
    vibe = "nightlife"; vibeScore = 85 + Math.min(10, nightlifeCount);
  } else if (culturalCount > total * 0.2) {
    vibe = "cultural"; vibeScore = 65;
  } else if (luxuryCount > total * 0.25 || avgRating >= 4.5) {
    vibe = "luxury"; vibeScore = 75 + (avgRating >= 4.5 ? 10 : 0);
  } else if (businessCount > total * 0.3 && h >= 9 && h <= 18) {
    vibe = "business"; vibeScore = 60;
  } else if (familyCount > total * 0.2) {
    vibe = "family"; vibeScore = 55;
  } else if (foodCount > total * 0.4) {
    vibe = "active"; vibeScore = 70;
  } else if (total > 20 && avgRating >= 4.0) {
    vibe = "trendy"; vibeScore = 72;
  } else if (total > 15) {
    vibe = "trendy"; vibeScore = 65;
  }

  let density = Math.min(100, total * 3.5);
  const peak = getPeakStatus(h);
  if (peak === "peak") density = Math.min(100, density * 1.4);
  else if (peak === "building") density = Math.min(100, density * 1.2);
  else if (peak === "winding_down") density = Math.min(100, density * 0.85);
  if (h >= 2 && h <= 6) density = Math.max(5, density * 0.25);

  const noiseLevel = nightlifeCount > 3 && h >= 21 ? "very_loud" :
    density > 70 ? "loud" : density > 40 ? "moderate" : "quiet";

  const avgPrice = entities.reduce((sum, e) => sum + (e.priceLevel ?? 2), 0) / Math.max(1, total);
  const priceRange = avgPrice >= 3.5 ? "luxury" : avgPrice >= 2.5 ? "premium" : avgPrice >= 1.5 ? "mid" : "budget";

  const tags: string[] = [];
  if (vibe === "nightlife") tags.push("🌙 Nightlife zone");
  if (vibe === "luxury") tags.push("✨ Premium area");
  if (vibe === "cultural") tags.push("🎭 Cultural quarter");
  if (foodCount > 5) tags.push("🍽️ Food hub");
  if (familyCount > 2) tags.push("👨‍👩‍👧 Family friendly");
  if (density > 70) tags.push("🔥 Busy now");
  if (density < 20 && total > 0) tags.push("🧘 Quiet area");
  if (avgRating >= 4.3) tags.push("⭐ Top rated zone");
  if (peak === "peak") tags.push("📈 Peak hour");
  if (peak === "building") tags.push("⬆️ Getting busy");

  const meta = VIBE_META[vibe];
  const openRate = h >= 9 && h <= 22 ? 0.8 : h >= 7 ? 0.5 : 0.2;

  const result: VibeDensityResult = {
    zoneId,
    vibe,
    vibeScore: Math.round(Math.min(100, vibeScore)),
    crowdDensity: Math.round(density),
    noiseLevel,
    priceRange,
    familyFriendly: familyCount > 0 || (nightlifeCount === 0 && h < 20),
    openNow: Math.round(total * openRate),
    totalPlaces: total,
    tags,
    vibeEmoji: meta.emoji,
    vibeLabel: meta.label,
    peakStatus: peak,
  };

  _cache.set(cacheKey, { result, ts: Date.now() });
  if (_cache.size > 100) {
    const oldest = [..._cache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) _cache.delete(oldest[0]);
  }

  return result;
}

export function clearVibeCache() {
  _cache.clear();
}
