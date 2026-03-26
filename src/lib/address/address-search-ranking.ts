/**
 * Address Search Ranking Engine — LOCAL-FIRST
 * 
 * Priority order (strict):
 * 1. Selected place context (manual user choice)
 * 2. GPS location context (live)
 * 3. Active country
 * 4. Active city
 * 5. Active district / zone_key
 * 6. Real distance (km)
 * 7. Text relevance
 * 8. Popularity
 *
 * Core rule: Geography > Text, Context > Keywords, Reality > Database
 * Default intent: LOCAL — international results only when explicitly requested.
 *
 * final_score =
 *   0.35 proximity_score
 * + 0.25 country_city_boost
 * + 0.15 district_zone_boost
 * + 0.15 text_match
 * + 0.10 popularity
 */
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";
import type { CanonicalPlaceRow } from "./canonical-address-resolver";

// ── Types ──

interface RankingContext {
  userLat?: number;
  userLng?: number;
  userCity?: string;
  userDistrict?: string;
  userCountry?: string;
  userId?: string;
  contextType?: string;
  query: string;
  /** zone_key e.g. "UNITED ARAB EMIRATES_DUBAI_MARSA_DUBAI" */
  zoneKey?: string;
}

interface RankedResult {
  place: CanonicalPlaceRow;
  score: number;
  reasons: string[];
  /** Debug: which radius bucket */
  _bucket?: string;
}

// ── Weights ──

const W_PROXIMITY = 0.35;
const W_COUNTRY_CITY = 0.25;
const W_DISTRICT_ZONE = 0.15;
const W_TEXT = 0.15;
const W_POPULARITY = 0.10;

// ── Radius buckets ──

function proximityBucketScore(distKm: number | null): { score: number; bucket: string } {
  if (distKm == null) return { score: 0.1, bucket: "unknown" };
  if (distKm <= 5) return { score: 1.0, bucket: "0-5km" };
  if (distKm <= 15) return { score: 0.8, bucket: "5-15km" };
  if (distKm <= 50) return { score: 0.6, bucket: "15-50km" };
  // Same country but far — still better than international
  return { score: 0.3, bucket: ">50km" };
}

// ── Country / City boost ──

function countryCityScore(
  place: CanonicalPlaceRow,
  userCountry?: string,
  userCity?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const placeCountry = (place.country ?? "").toLowerCase().trim();
  const placeCity = (place.city ?? "").toLowerCase().trim();
  const ctxCountry = (userCountry ?? "").toLowerCase().trim();
  const ctxCity = (userCity ?? "").toLowerCase().trim();

  // No context → neutral
  if (!ctxCountry && !ctxCity) return { score: 0.5, reasons: [] };

  let score = 0;

  // Country match
  if (ctxCountry && placeCountry) {
    if (placeCountry === ctxCountry || placeCountry.includes(ctxCountry) || ctxCountry.includes(placeCountry)) {
      score += 0.6;
      reasons.push("same_country");
    } else {
      // International penalty — hard downrank
      score -= 0.3;
      reasons.push("foreign_country");
    }
  }

  // City match
  if (ctxCity && placeCity) {
    if (placeCity === ctxCity || placeCity.includes(ctxCity) || ctxCity.includes(placeCity)) {
      score += 0.4;
      reasons.push("same_city");
    }
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

// ── District / Zone boost ──

function districtZoneScore(
  place: CanonicalPlaceRow,
  userDistrict?: string,
  zoneKey?: string,
): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  const placeDistrict = (place.district ?? "").toLowerCase().trim();
  const ctxDistrict = (userDistrict ?? "").toLowerCase().trim();

  let score = 0;

  if (ctxDistrict && placeDistrict) {
    if (placeDistrict === ctxDistrict || placeDistrict.includes(ctxDistrict) || ctxDistrict.includes(placeDistrict)) {
      score += 0.7;
      reasons.push("same_district");
    }
  }

  // zone_key partial match (e.g. same city/district segment)
  if (zoneKey && place.zone_key) {
    const pZone = (place.zone_key as string).toLowerCase();
    const uZone = zoneKey.toLowerCase();
    if (pZone === uZone) {
      score += 0.3;
      reasons.push("exact_zone");
    } else {
      // Check city-level match from zone_key
      const pParts = pZone.split("_");
      const uParts = uZone.split("_");
      if (pParts.length >= 2 && uParts.length >= 2 && pParts[0] === uParts[0] && pParts[1] === uParts[1]) {
        score += 0.15;
        reasons.push("zone_city_match");
      }
    }
  }

  return { score: Math.max(0, Math.min(1, score)), reasons };
}

// ── Text relevance (downweighted — geography wins) ──

function textRelevanceScore(query: string, place: CanonicalPlaceRow): number {
  const q = query.toLowerCase().trim();
  const label = (place.short_label ?? "").toLowerCase();
  const addr = place.formatted_address.toLowerCase();
  const district = (place.district ?? "").toLowerCase();
  const building = (place.building ?? "").toLowerCase();
  const city = (place.city ?? "").toLowerCase();

  if (label === q || addr === q) return 1.0;
  if (label.startsWith(q)) return 0.9;
  if (building.startsWith(q)) return 0.85;
  if (district.startsWith(q)) return 0.8;
  if (city.startsWith(q)) return 0.75;
  if (addr.includes(q)) return 0.6;
  if (label.includes(q)) return 0.55;
  return 0.2;
}

// ── Detect if query explicitly names a foreign location ──

function queryExplicitlyForeign(query: string, userCountry?: string): boolean {
  if (!userCountry) return false;
  const q = query.toLowerCase();
  const country = userCountry.toLowerCase();
  // If query contains a different well-known country/city, it's explicit foreign intent
  const foreignIndicators = ["usa", "united states", "new york", "london", "paris", "tokyo", "singapore"];
  // But only if NOT the user's own country
  if (country.includes("united arab") || country.includes("uae")) {
    return foreignIndicators.some(f => q.includes(f));
  }
  return false;
}

// ── Main ranking function ──

export function rankResults(places: CanonicalPlaceRow[], ctx: RankingContext): RankedResult[] {
  const isExplicitForeign = queryExplicitlyForeign(ctx.query, ctx.userCountry);

  return places.map(place => {
    const reasons: string[] = [];
    let score = 0;

    // 1. Proximity (weight: 35%)
    let distKm: number | null = null;
    if (ctx.userLat != null && ctx.userLng != null) {
      distKm = haversineKm(ctx.userLat, ctx.userLng, Number(place.lat), Number(place.lng));
    }
    const { score: proxScore, bucket } = proximityBucketScore(distKm);
    score += proxScore * W_PROXIMITY;
    if (proxScore >= 0.8) reasons.push("nearby");

    // 2. Country / City (weight: 25%)
    if (!isExplicitForeign) {
      const cc = countryCityScore(place, ctx.userCountry, ctx.userCity);
      score += cc.score * W_COUNTRY_CITY;
      reasons.push(...cc.reasons);
    } else {
      // Explicit foreign query — neutral country scoring
      score += 0.5 * W_COUNTRY_CITY;
    }

    // 3. District / Zone (weight: 15%)
    const dz = districtZoneScore(place, ctx.userDistrict, ctx.zoneKey);
    score += dz.score * W_DISTRICT_ZONE;
    reasons.push(...dz.reasons);

    // 4. Text relevance (weight: 15%)
    const textScore = textRelevanceScore(ctx.query, place);
    score += textScore * W_TEXT;
    if (textScore > 0.7) reasons.push("text_match");

    // 5. Popularity (weight: 10%)
    const popScore = Math.min((place.popularity_score ?? 0) / 100, 1);
    score += popScore * W_POPULARITY;
    if (popScore > 0.5) reasons.push("popular");

    // 6. Confidence baseline
    score += (place.confidence_score ?? 0.5) * 0.02; // tiny tiebreaker

    return { place, score, reasons, _bucket: bucket };
  })
  // Sort: score DESC, then proximity ASC as tiebreaker
  .sort((a, b) => {
    const diff = b.score - a.score;
    if (Math.abs(diff) < 0.001) {
      // Tiebreak by distance
      const dA = a._bucket === "0-5km" ? 0 : a._bucket === "5-15km" ? 1 : 2;
      const dB = b._bucket === "0-5km" ? 0 : b._bucket === "5-15km" ? 1 : 2;
      return dA - dB;
    }
    return diff;
  });
}

/**
 * Get on-focus suggestions (no query typed yet).
 * Priority: recent → favorites → popular nearby.
 */
export async function getOnFocusSuggestions(params: {
  userId: string;
  userLat?: number;
  userLng?: number;
  contextType?: string;
  limit?: number;
}): Promise<CanonicalPlaceRow[]> {
  const { userId, limit = 8 } = params;

  const { data: recentEvents } = await (supabase as any)
    .from("address_usage_events")
    .select("canonical_place_id, canonical_places:canonical_place_id(*)")
    .eq("user_id", userId)
    .in("action_type", ["selected", "delivered", "booked"])
    .order("created_at", { ascending: false })
    .limit(limit);

  const seen = new Set<string>();
  const places: CanonicalPlaceRow[] = [];

  for (const row of recentEvents ?? []) {
    const p = (row as any).canonical_places;
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      places.push(p);
    }
  }

  return places.slice(0, limit);
}
