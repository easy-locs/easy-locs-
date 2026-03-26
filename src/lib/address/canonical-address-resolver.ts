/**
 * Canonical Address Resolver — Single pipeline for ALL address flows.
 * 
 * PIPELINE:
 * source input → normalize → geocode → canonical match/dedupe → enrich → active context → events
 * 
 * Every module (food, taxi, parcel, services, orbit, wallet, radar) uses this.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import {
  computeZoneKey,
  simpleGeohash,
  type CanonicalPlace,
  type AddressContextType,
  type AddressSourceType,
  type AddressActionType,
} from "@/lib/address/canonical-place";

// ── DB Row Types ──

export interface CanonicalPlaceRow {
  id: string;
  provider: string;
  provider_place_id: string | null;
  place_type: string;
  country_code: string;
  country_name: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  street: string | null;
  building: string | null;
  landmark: string | null;
  formatted_address: string;
  short_label: string | null;
  lat: number;
  lng: number;
  timezone: string | null;
  geohash: string | null;
  zone_key: string | null;
  parent_place_id: string | null;
  popularity_score: number;
  confidence_score: number;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface UserSavedAddress {
  id: string;
  user_id: string;
  canonical_place_id: string | null;
  label: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  apartment: string | null;
  floor: string | null;
  unit_number: string | null;
  entrance: string | null;
  delivery_note: string | null;
  is_default: boolean;
  is_favorite: boolean;
  last_used_at: string | null;
  place?: CanonicalPlaceRow | null;
}

export interface ActiveAddressContext {
  user_id: string;
  context_type: string;
  canonical_place_id: string | null;
  source_type: string | null;
  source: string;
  lat: number;
  lng: number;
  country_code: string | null;
  city: string | null;
  district: string | null;
  zone_key: string | null;
}

export interface ResolvedAddress {
  canonical_place_id: string;
  formatted_address: string;
  short_label: string | null;
  country_code: string;
  country_name: string | null;
  city: string | null;
  district: string | null;
  subdistrict: string | null;
  postal_code: string | null;
  street: string | null;
  building: string | null;
  landmark: string | null;
  lat: number;
  lng: number;
  timezone: string | null;
  geohash: string | null;
  place_type: string;
  zone_key: string;
  confidence_score: number;
  source_type: string;
}

// ── Normalization ──

function normalizeInput(raw: string): string {
  return raw.trim().replace(/\s{2,}/g, " ").replace(/,\s*,/g, ",");
}

// ── Deduplication: find existing canonical place ──

async function findExistingPlace(place: CanonicalPlace): Promise<CanonicalPlaceRow | null> {
  // 1. By provider_place_id (exact match)
  if (place.provider_place_id) {
    const { data } = await (supabase as any)
      .from("canonical_places")
      .select("*")
      .eq("provider", place.provider)
      .eq("provider_place_id", place.provider_place_id)
      .maybeSingle();
    if (data) return data;
  }

  // 2. By geohash + formatted_address similarity (proximity dedup)
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

// ── Upsert: create or reuse canonical place ──

export async function upsertCanonicalPlace(place: CanonicalPlace): Promise<CanonicalPlaceRow | null> {
  const existing = await findExistingPlace(place);
  if (existing) {
    // Bump popularity
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

// ── Get canonical place by ID ──

export async function getCanonicalPlace(id: string): Promise<CanonicalPlaceRow | null> {
  const { data } = await (supabase as any)
    .from("canonical_places")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data;
}

// ── Search canonical places (ranked) ──

export async function searchCanonicalPlaces(params: {
  query: string;
  countryCode?: string;
  city?: string;
  limit?: number;
  userId?: string;
  contextType?: string;
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

// ── User Saved Addresses ──

export async function getUserSavedAddresses(userId: string): Promise<UserSavedAddress[]> {
  const { data } = await (supabase as any)
    .from("user_saved_addresses")
    .select("*, place:canonical_places(*)")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("is_favorite", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false });
  return data ?? [];
}

export async function saveUserAddress(params: {
  userId: string;
  canonicalPlaceId: string;
  label?: string;
  contactName?: string;
  contactPhone?: string;
  apartment?: string;
  floor?: string;
  deliveryNote?: string;
  isDefault?: boolean;
  isFavorite?: boolean;
}): Promise<UserSavedAddress | null> {
  if (params.isDefault) {
    await (supabase as any)
      .from("user_saved_addresses")
      .update({ is_default: false })
      .eq("user_id", params.userId)
      .eq("is_default", true);
  }

  const { data, error } = await (supabase as any)
    .from("user_saved_addresses")
    .insert({
      user_id: params.userId,
      canonical_place_id: params.canonicalPlaceId,
      label: params.label ?? null,
      contact_name: params.contactName ?? null,
      contact_phone: params.contactPhone ?? null,
      apartment: params.apartment ?? null,
      floor: params.floor ?? null,
      delivery_note: params.deliveryNote ?? null,
      is_default: params.isDefault ?? false,
      is_favorite: params.isFavorite ?? false,
    })
    .select("*")
    .single();

  if (error) console.error("[address-resolver] save address failed:", error);
  return data;
}

export async function deleteUserAddress(addressId: string): Promise<void> {
  await (supabase as any).from("user_saved_addresses").delete().eq("id", addressId);
}

// ── Active Address Context (multi-context) ──

export async function getActiveAddressContext(userId: string, contextType: AddressContextType = "global"): Promise<ActiveAddressContext | null> {
  const { data } = await (supabase as any)
    .from("user_active_address_context")
    .select("*")
    .eq("user_id", userId)
    .eq("context_type", contextType)
    .maybeSingle();
  return data;
}

export async function getAllActiveContexts(userId: string): Promise<ActiveAddressContext[]> {
  const { data } = await (supabase as any)
    .from("user_active_address_context")
    .select("*")
    .eq("user_id", userId);
  return data ?? [];
}

export async function setActiveAddressContext(params: {
  userId: string;
  contextType: AddressContextType;
  canonicalPlaceId: string | null;
  sourceType: AddressSourceType;
  lat: number;
  lng: number;
  countryCode?: string;
  city?: string;
  district?: string;
  zoneKey?: string;
}): Promise<void> {
  const zoneKey = params.zoneKey ?? computeZoneKey(params.countryCode ?? "AE", params.city, params.district);

  const row = {
    user_id: params.userId,
    context_type: params.contextType,
    canonical_place_id: params.canonicalPlaceId,
    source: params.sourceType,
    source_type: params.sourceType,
    lat: params.lat,
    lng: params.lng,
    country_code: params.countryCode ?? null,
    city: params.city ?? null,
    district: params.district ?? null,
    zone_key: zoneKey,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("user_active_address_context")
    .upsert(row, { onConflict: "user_id,context_type" });

  if (error) {
    console.error("[address-resolver] set active context failed:", error);
    return;
  }

  // Emit events
  eventBus.emit("address.context.updated", {
    userId: params.userId,
    contextType: params.contextType,
    lat: params.lat,
    lng: params.lng,
    sourceType: params.sourceType,
    canonicalPlaceId: params.canonicalPlaceId,
    zoneKey,
  });
  eventBus.emit("radar.context.refresh", { userId: params.userId, zoneKey });
  eventBus.emit("eta.context.refresh", { userId: params.userId, contextType: params.contextType });
  eventBus.emit("merchant.visibility.refresh", { zoneKey });
}

// ── Usage Events (analytics + ranking) ──

export async function trackAddressUsage(params: {
  userId: string;
  canonicalPlaceId: string;
  contextType: string;
  actionType: AddressActionType;
  searchQuery?: string;
}): Promise<void> {
  await (supabase as any).from("address_usage_events").insert({
    user_id: params.userId,
    canonical_place_id: params.canonicalPlaceId,
    context_type: params.contextType,
    action_type: params.actionType,
    search_query: params.searchQuery ?? null,
  });

  // Bump popularity
  try { await (supabase as any).rpc("increment_popularity", { place_id: params.canonicalPlaceId }); } catch {}
}

// ── Get recent places for a user ──

export async function getRecentPlaces(userId: string, limit = 5): Promise<CanonicalPlaceRow[]> {
  const { data } = await (supabase as any)
    .from("address_usage_events")
    .select("canonical_place_id, canonical_places:canonical_place_id(*)")
    .eq("user_id", userId)
    .eq("action_type", "selected")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (!data) return [];
  const seen = new Set<string>();
  const places: CanonicalPlaceRow[] = [];
  for (const row of data) {
    const p = (row as any).canonical_places;
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      places.push(p);
    }
  }
  return places;
}

// ── Full Resolution Pipeline ──

export async function resolveAddress(place: CanonicalPlace, sourceType: AddressSourceType = "manual"): Promise<ResolvedAddress> {
  const row = await upsertCanonicalPlace(place);
  const placeId = row?.id ?? place.id ?? "";
  const zoneKey = row?.zone_key ?? place.zone_key ?? computeZoneKey(place.country_code, place.city, place.district);

  return {
    canonical_place_id: placeId,
    formatted_address: row?.formatted_address ?? place.formatted_address,
    short_label: row?.short_label ?? place.label,
    country_code: row?.country_code ?? place.country_code,
    country_name: row?.country_name ?? place.country_name ?? null,
    city: row?.city ?? place.city ?? null,
    district: row?.district ?? place.district ?? null,
    subdistrict: row?.subdistrict ?? place.subdistrict ?? null,
    postal_code: row?.postal_code ?? place.postcode ?? null,
    street: row?.street ?? place.street ?? null,
    building: row?.building ?? place.building ?? null,
    landmark: row?.landmark ?? place.landmark ?? null,
    lat: Number(row?.lat ?? place.lat),
    lng: Number(row?.lng ?? place.lng),
    timezone: row?.timezone ?? place.timezone ?? null,
    geohash: row?.geohash ?? place.geohash ?? null,
    place_type: row?.place_type ?? place.place_type,
    zone_key: zoneKey,
    confidence_score: row?.confidence_score ?? place.confidence_score ?? 0.7,
    source_type: sourceType,
  };
}

/**
 * Resolve and set as active context for a user.
 * Full pipeline: resolve → save → set active → emit events.
 */
export async function resolveAndActivate(params: {
  userId: string;
  place: CanonicalPlace;
  source: AddressSourceType;
  contextType?: AddressContextType;
}): Promise<ResolvedAddress> {
  const resolved = await resolveAddress(params.place, params.source);
  const ctx = params.contextType ?? "global";

  await setActiveAddressContext({
    userId: params.userId,
    contextType: ctx,
    canonicalPlaceId: resolved.canonical_place_id,
    sourceType: params.source,
    lat: resolved.lat,
    lng: resolved.lng,
    countryCode: resolved.country_code,
    city: resolved.city ?? undefined,
    district: resolved.district ?? undefined,
    zoneKey: resolved.zone_key,
  });

  await trackAddressUsage({
    userId: params.userId,
    canonicalPlaceId: resolved.canonical_place_id,
    contextType: ctx,
    actionType: "selected",
  });

  return resolved;
}

// ── Category-specific helpers ──

export async function getDeliveryAddress(userId: string, contextType: AddressContextType = "food_delivery"): Promise<ResolvedAddress | null> {
  // Try specific context first, then fallback to global
  let ctx = await getActiveAddressContext(userId, contextType);
  if (!ctx?.canonical_place_id) {
    ctx = await getActiveAddressContext(userId, "global");
  }
  if (!ctx?.canonical_place_id) return null;

  const place = await getCanonicalPlace(ctx.canonical_place_id);
  if (!place) return null;

  const zoneKey = place.zone_key ?? computeZoneKey(place.country_code, place.city ?? "unknown", place.district);

  return {
    canonical_place_id: place.id,
    formatted_address: place.formatted_address,
    short_label: place.short_label,
    country_code: place.country_code,
    country_name: place.country_name,
    city: place.city,
    district: place.district,
    subdistrict: place.subdistrict,
    postal_code: place.postal_code,
    street: place.street,
    building: place.building,
    landmark: place.landmark,
    lat: Number(place.lat),
    lng: Number(place.lng),
    timezone: place.timezone,
    geohash: place.geohash,
    place_type: place.place_type,
    zone_key: zoneKey,
    confidence_score: place.confidence_score ?? 0.9,
    source_type: "saved",
  };
}

export async function getTaxiAddressPriorities(userId: string): Promise<UserSavedAddress[]> {
  const saved = await getUserSavedAddresses(userId);
  return saved.sort((a, b) => {
    const order = ["home", "work", "airport"];
    const aIdx = order.indexOf(a.label?.toLowerCase() ?? "");
    const bIdx = order.indexOf(b.label?.toLowerCase() ?? "");
    if (aIdx >= 0 && bIdx >= 0) return aIdx - bIdx;
    if (aIdx >= 0) return -1;
    if (bIdx >= 0) return 1;
    return 0;
  });
}

// ── Merchant Geo Context ──

export async function upsertMerchantGeoContext(params: {
  merchantId: string;
  canonicalPlaceId: string;
  lat: number;
  lng: number;
  zoneKey: string;
  deliveryRadiusKm?: number;
  pickupEnabled?: boolean;
  deliveryEnabled?: boolean;
}): Promise<void> {
  const { error } = await (supabase as any)
    .from("merchant_geo_context")
    .upsert({
      merchant_id: params.merchantId,
      canonical_place_id: params.canonicalPlaceId,
      lat: params.lat,
      lng: params.lng,
      zone_key: params.zoneKey,
      delivery_radius_km: params.deliveryRadiusKm ?? 5,
      pickup_enabled: params.pickupEnabled ?? true,
      delivery_enabled: params.deliveryEnabled ?? true,
      updated_at: new Date().toISOString(),
    }, { onConflict: "merchant_id" });
  if (error) console.error("[address-resolver] merchant geo upsert failed:", error);
}
