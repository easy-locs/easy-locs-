/**
 * Address Search Ranking Engine
 * 
 * Re-ranks provider search results using:
 * - User history score
 * - GPS proximity score
 * - Text relevance score
 * - Local popularity score
 * - Category context score
 * - Active city/district boost
 */
import { supabase } from "@/integrations/supabase/client";
import type { CanonicalPlaceRow } from "./canonical-address-resolver";

interface RankingContext {
  userLat?: number;
  userLng?: number;
  userCity?: string;
  userDistrict?: string;
  userId?: string;
  contextType?: string;
  query: string;
}

interface RankedResult {
  place: CanonicalPlaceRow;
  score: number;
  reasons: string[];
}

// Haversine distance in km
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function textRelevanceScore(query: string, place: CanonicalPlaceRow): number {
  const q = query.toLowerCase();
  const label = (place.short_label ?? "").toLowerCase();
  const addr = place.formatted_address.toLowerCase();
  const district = (place.district ?? "").toLowerCase();
  const building = (place.building ?? "").toLowerCase();
  
  if (label === q || addr === q) return 1.0;
  if (label.startsWith(q)) return 0.9;
  if (building.startsWith(q)) return 0.85;
  if (district.startsWith(q)) return 0.8;
  if (addr.includes(q)) return 0.6;
  return 0.3;
}

function proximityScore(userLat: number, userLng: number, placeLat: number, placeLng: number): number {
  const dist = haversineKm(userLat, userLng, placeLat, placeLng);
  if (dist < 1) return 1.0;
  if (dist < 5) return 0.8;
  if (dist < 15) return 0.5;
  if (dist < 50) return 0.3;
  return 0.1;
}

function cityDistrictBoost(place: CanonicalPlaceRow, userCity?: string, userDistrict?: string): number {
  let boost = 0;
  if (userCity && place.city?.toLowerCase() === userCity.toLowerCase()) boost += 0.3;
  if (userDistrict && place.district?.toLowerCase() === userDistrict.toLowerCase()) boost += 0.2;
  return boost;
}

export function rankResults(places: CanonicalPlaceRow[], ctx: RankingContext): RankedResult[] {
  return places.map(place => {
    const reasons: string[] = [];
    let score = 0;

    // Text relevance (weight: 30%)
    const textScore = textRelevanceScore(ctx.query, place);
    score += textScore * 0.3;
    if (textScore > 0.7) reasons.push("text_match");

    // Proximity (weight: 25%)
    if (ctx.userLat != null && ctx.userLng != null) {
      const proxScore = proximityScore(ctx.userLat, ctx.userLng, Number(place.lat), Number(place.lng));
      score += proxScore * 0.25;
      if (proxScore > 0.7) reasons.push("nearby");
    }

    // Popularity (weight: 20%)
    const popScore = Math.min((place.popularity_score ?? 0) / 100, 1);
    score += popScore * 0.2;
    if (popScore > 0.5) reasons.push("popular");

    // City/district boost (weight: 15%)
    const cdBoost = cityDistrictBoost(place, ctx.userCity, ctx.userDistrict);
    score += cdBoost * 0.15;
    if (cdBoost > 0.3) reasons.push("local");

    // Confidence (weight: 10%)
    score += (place.confidence_score ?? 0.7) * 0.1;

    return { place, score, reasons };
  }).sort((a, b) => b.score - a.score);
}

/**
 * Get on-focus suggestions (no query typed yet).
 * Priority: current location → default → favorites → recent → popular nearby.
 */
export async function getOnFocusSuggestions(params: {
  userId: string;
  userLat?: number;
  userLng?: number;
  contextType?: string;
  limit?: number;
}): Promise<CanonicalPlaceRow[]> {
  const { userId, limit = 8 } = params;

  // Get recent places
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
