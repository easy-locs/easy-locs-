/**
 * Canonical Address Resolver — Place lookup operations.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  computeZoneKey,
  simpleGeohash,
  type CanonicalPlace,
} from "@/lib/address/canonical-place";
import type { CanonicalPlaceRow } from "./types";

function normalizeInput(raw: string): string {
  return raw.trim().replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",");
}

export async function findExistingPlace(place: CanonicalPlace): Promise<CanonicalPlaceRow | null> {
  if (place.provider_place_id) {
    const { data } = await (supabase as any)
      .from("canonical_places")
      .select("*")
      .eq("provider", place.provider)
      .eq("provider_place_id", place.provider_place_id)
      .maybeSingle();
    if (data) return data;
  }

  const gh = place.geohash ?? simpleGeohash(place.lat, place.lng);
  if (gh) {
    const prefix = gh.substring(0, 4);
    const { data: nearby } = await (supabase as any)
      .from("canonical_places")
      .select("*")
      .like("geohash", `${prefix}%`)
      .ilike("formatted_address", `%${normalizeInput(place.formatted_address).substring(0, 30)}%`)
      .limit(1);
    if (nearby?.length) return nearby[0];
  }

  return null;
}

export async function upsertCanonicalPlace(place: CanonicalPlace): Promise<CanonicalPlaceRow | null> {
  const existing = await findExistingPlace(place);
  if (existing) {
    await (supabase as any)
      .from("canonical_places")
      .update({ popularity_score: (existing.popularity_score ?? 0) + 1, updated_at: new Date().toISOString() })
      .eq("id", existing.id);
    return existing;
  }

  const zoneKey = place.zone_key ?? computeZoneKey(place.country_code, place.city, place.district);
  const geohash = place.geohash ?? simpleGeohash(place.lat, place.lng);

  const row = {
    provider: place.provider,
    provider_place_id: place.provider_place_id ?? null,
    place_type: place.place_type ?? "address",
    country_code: place.country_code,
    country_name: place.country_name ?? null,
    city: place.city ?? null,
    district: place.district ?? null,
    subdistrict: place.subdistrict ?? null,
    postal_code: place.postcode ?? null,
    street: place.street ?? null,
    building: place.building ?? null,
    landmark: place.landmark ?? null,
    formatted_address: place.formatted_address,
    short_label: place.label,
    lat: place.lat,
    lng: place.lng,
    timezone: place.timezone ?? null,
    geohash,
    zone_key: zoneKey,
    confidence_score: place.confidence_score ?? 0.7,
    metadata_json: place.metadata ?? {},
  };

  const { data, error } = await (supabase as any)
    .from("canonical_places")
    .insert(row)
    .select("*")
    .single();

  if (error) {
    console.error("[address-resolver] upsert failed:", error);
    return null;
  }
  return data;
}

export async function getCanonicalPlace(id: string): Promise<CanonicalPlaceRow | null> {
  const { data } = await (supabase as any)
    .from("canonical_places")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function searchCanonicalPlaces(params: {
  query: string;
  countryCode?: string;
  city?: string;
  limit?: number;
}): Promise<CanonicalPlaceRow[]> {
  const { query, countryCode, city, limit = 10 } = params;

  let q = (supabase as any)
    .from("canonical_places")
    .select("*")
    .limit(limit);

  if (query.length >= 2) {
    q = q.or(`formatted_address.ilike.%${query}%,short_label.ilike.%${query}%,city.ilike.%${query}%,district.ilike.%${query}%,landmark.ilike.%${query}%,building.ilike.%${query}%,street.ilike.%${query}%`);
  }

  if (countryCode) q = q.eq("country_code", countryCode);
  if (city) q = q.ilike("city", `%${city}%`);

  q = q.order("popularity_score", { ascending: false });

  const { data } = await q;
  return data ?? [];
}
