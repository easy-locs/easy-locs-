/**
 * SEARCH BRAIN V1 — Canonical search ordering truth.
 * 
 * Architecture law:
 *   providers / canonical_places / cache
 *     → Search Brain (this file)
 *     → usePlatformBrain or hooks
 *     → autocomplete / selector / radar / delivery
 * 
 * NO component may rerank results after Search Brain output.
 * Geo Brain owns location truth. Search Brain owns search ordering truth.
 * UI owns display only.
 * 
 * Priority: selectedPlace > GPS > country > city > district > proximity > text > popularity
 *
 * Scoring:
 *   0.30 proximity + 0.20 country_city + 0.15 district_zone
 * + 0.15 text + 0.10 popularity + 0.05 category + 0.05 serviceability
 */
import { searchPlaces, type NormalizedPlace } from "@/lib/location/geocode";
import { searchCanonicalPlaces, type CanonicalPlaceRow } from "@/lib/address/canonical-address-resolver";
import { getGeoBrainState } from "@/lib/brain/geo-brain";
import { haversineKm } from "@/lib/geo/distance";
import { resolveSearchIntent, type SearchIntent } from "./search-intent-resolver";
import { normalizeProviderResult, type SearchCandidate } from "./search-provider-normalizer";
import { localRank } from "./search-local-ranker";

// ── Feature flags ──
export const SEARCH_BRAIN_ENABLED = true;
export const SEARCH_BRAIN_MODE: "shadow" | "assist" | "execute" = "execute";

// ── Search context ──
export interface SearchBrainContext {
  query: string;
  contextType?: string; // global | food_delivery | taxi_pickup | taxi_dropoff | parcel_pickup ...
  userIntent?: string;  // address | place | merchant | airport_transfer | delivery_destination
  vertical?: string;
}

// ── Enriched output ──
export interface SearchBrainResult {
  id: string;
  canonical_place_id?: string;
  label: string;
  formatted_address: string;
  lat: number;
  lng: number;
  country_code?: string;
  country_name?: string;
  city?: string;
  district?: string;
  zone_key?: string;
  place_type: string;
  provider: string;
  final_score: number;
  score_breakdown: {
    proximity: number;
    country_city: number;
    district_zone: number;
    text: number;
    popularity: number;
    category: number;
    serviceability: number;
  };
  local_rank_bucket: string;
  badges: string[];
  category_hints: string[];
  serviceability_hint?: string;
  eta_hint?: number | null;
  search_reason: string;
}

// ── Main entry point ──
export async function searchBrain(ctx: SearchBrainContext): Promise<SearchBrainResult[]> {
  if (!SEARCH_BRAIN_ENABLED) return [];
  const q = ctx.query.trim();
  if (q.length < 2) return [];

  // 1. Resolve intent
  const intent = resolveSearchIntent(q, ctx.contextType);

  // 2. Get geo context from Geo Brain (single source of truth)
  const geo = getGeoBrainState();
  const userLat = geo.selectedLocation?.lat ?? geo.gpsPoint?.lat;
  const userLng = geo.selectedLocation?.lng ?? geo.gpsPoint?.lng;
  const userCountry = geo.selectedLocation?.country;
  const userCity = geo.selectedLocation?.city;
  const userDistrict = geo.selectedLocation?.area;
  const zoneKey = geo.zoneKey;

  // 3. Fetch from providers + canonical DB in parallel
  const [providerResults, canonicalResults] = await Promise.all([
    searchPlaces(q, {
      proximity: userLat != null && userLng != null ? { lat: userLat, lng: userLng } : undefined,
      limit: 8,
    }).catch(() => [] as NormalizedPlace[]),
    searchCanonicalPlaces({
      query: q,
      countryCode: intent.inferredCountryCode,
      city: intent.isExplicitForeign ? undefined : userCity ?? undefined,
      limit: 8,
    }).catch(() => [] as CanonicalPlaceRow[]),
  ]);

  // 4. Normalize all into SearchCandidate[]
  const candidates: SearchCandidate[] = [];
  const seenCoords = new Set<string>();

  // Canonical results first (higher trust)
  for (const cp of canonicalResults) {
    const key = `${Number(cp.lat).toFixed(4)},${Number(cp.lng).toFixed(4)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);
    candidates.push({
      id: cp.id,
      canonical_place_id: cp.id,
      label: cp.short_label ?? cp.formatted_address,
      formatted_address: cp.formatted_address,
      lat: Number(cp.lat),
      lng: Number(cp.lng),
      country_code: cp.country_code,
      country_name: cp.country_name ?? undefined,
      city: cp.city ?? undefined,
      district: cp.district ?? undefined,
      zone_key: cp.zone_key ?? undefined,
      place_type: cp.place_type,
      provider: cp.provider,
      popularity_score: cp.popularity_score ?? 0,
      confidence_score: cp.confidence_score ?? 0.7,
    });
  }

  // Then provider results (deduped)
  for (const np of providerResults) {
    const key = `${np.lat.toFixed(4)},${np.lng.toFixed(4)}`;
    if (seenCoords.has(key)) continue;
    seenCoords.add(key);
    candidates.push(normalizeProviderResult(np));
  }

  // 5. Rank through local-first ranker
  const ranked = localRank(candidates, {
    query: q,
    userLat,
    userLng,
    userCountry,
    userCity,
    userDistrict,
    zoneKey,
    contextType: ctx.contextType,
    intent,
  });

  // 6. Build enriched output
  return ranked.map(r => ({
    id: r.candidate.id,
    canonical_place_id: r.candidate.canonical_place_id,
    label: r.candidate.label,
    formatted_address: r.candidate.formatted_address,
    lat: r.candidate.lat,
    lng: r.candidate.lng,
    country_code: r.candidate.country_code,
    country_name: r.candidate.country_name,
    city: r.candidate.city,
    district: r.candidate.district,
    zone_key: r.candidate.zone_key,
    place_type: r.candidate.place_type,
    provider: r.candidate.provider,
    final_score: r.score,
    score_breakdown: r.breakdown,
    local_rank_bucket: r.bucket,
    badges: r.reasons,
    category_hints: [],
    search_reason: r.reasons.join(", ") || "relevance",
  }));
}
