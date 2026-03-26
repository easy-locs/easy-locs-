/**
 * Canonical Address Resolver — Single pipeline for all address flows.
 * 
 * PIPELINE:
 * source input → canonical resolver → canonical_places dictionary → active context → geo enrichment → events
 * 
 * Every module (food, taxi, parcel, services, orbit, wallet, radar) uses this.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import { buildZoneKey } from "@/lib/mobility/live-context-engine";
import type { CanonicalPlace } from "@/lib/address/canonical-place";

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
  parent_place_id: string | null;
  popularity_score: number;
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
  last_used_at: string | null;
  place?: CanonicalPlaceRow | null;
}

export interface ActiveAddressContext {
  user_id: string;
  canonical_place_id: string | null;
  source: string;
  lat: number;
  lng: number;
  country_code: string | null;
  city: string | null;
  district: string | null;
}

export interface ResolvedAddress {
  canonical_place_id: string;
  formatted_address: string;
  short_label: string | null;
  country_code: string;
  city: string | null;
  district: string | null;
  street: string | null;
  building: string | null;
  lat: number;
  lng: number;
  timezone: string | null;
  place_type: string;
  zone_key: string;
  confidence_score: number;
}

// ── Resolve: CanonicalPlace → DB row (upsert + dedupe) ──

export async function upsertCanonicalPlace(place: CanonicalPlace): Promise<CanonicalPlaceRow | null> {
  // Dedupe by provider + provider_place_id
  if (place.provider_place_id) {
    const { data: existing } = await (supabase as any)
      .from("canonical_places")
      .select("*")
      .eq("provider", place.provider)
      .eq("provider_place_id", place.provider_place_id)
      .maybeSingle();

    if (existing) {
      // Update popularity
      await (supabase as any)
        .from("canonical_places")
        .update({ popularity_score: (existing.popularity_score ?? 0) + 1, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return existing;
    }
  }

  const row = {
    provider: place.provider,
    provider_place_id: place.provider_place_id ?? null,
    place_type: place.place_type ?? "address",
    country_code: place.country_code,
    city: place.city ?? null,
    district: place.district ?? null,
    formatted_address: place.formatted_address,
    short_label: place.label,
    lat: place.lat,
    lng: place.lng,
    timezone: place.timezone ?? null,
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

  // Text search
  if (query.length >= 2) {
    q = q.or(`formatted_address.ilike.%${query}%,short_label.ilike.%${query}%,city.ilike.%${query}%,district.ilike.%${query}%,landmark.ilike.%${query}%`);
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
}): Promise<UserSavedAddress | null> {
  // If setting as default, clear other defaults
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
    })
    .select("*")
    .single();

  if (error) console.error("[address-resolver] save address failed:", error);
  return data;
}

export async function deleteUserAddress(addressId: string): Promise<void> {
  await (supabase as any).from("user_saved_addresses").delete().eq("id", addressId);
}

// ── Active Address Context ──

export async function getActiveAddressContext(userId: string): Promise<ActiveAddressContext | null> {
  const { data } = await (supabase as any)
    .from("user_active_address_context")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

export async function setActiveAddressContext(params: {
  userId: string;
  canonicalPlaceId: string | null;
  source: "gps" | "saved" | "manual" | "recent";
  lat: number;
  lng: number;
  countryCode?: string;
  city?: string;
  district?: string;
}): Promise<void> {
  const row = {
    user_id: params.userId,
    canonical_place_id: params.canonicalPlaceId,
    source: params.source,
    lat: params.lat,
    lng: params.lng,
    country_code: params.countryCode ?? null,
    city: params.city ?? null,
    district: params.district ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await (supabase as any)
    .from("user_active_address_context")
    .upsert(row, { onConflict: "user_id" });

  if (error) {
    console.error("[address-resolver] set active context failed:", error);
    return;
  }

  // Emit events
  eventBus.emit("address.context.updated", {
    userId: params.userId,
    lat: params.lat,
    lng: params.lng,
    source: params.source,
    canonicalPlaceId: params.canonicalPlaceId,
  });

  eventBus.emit("radar.context.refresh", { userId: params.userId });
}

// ── Usage Events (analytics) ──

export async function trackAddressUsage(params: {
  userId: string;
  canonicalPlaceId: string;
  contextType: string; // food / grocery / taxi / parcel / services
  actionType: string;  // search / selected / delivered / booked
}): Promise<void> {
  await (supabase as any).from("address_usage_events").insert({
    user_id: params.userId,
    canonical_place_id: params.canonicalPlaceId,
    context_type: params.contextType,
    action_type: params.actionType,
  });

  // Bump popularity
  await (supabase as any).rpc("increment_popularity", { place_id: params.canonicalPlaceId }).catch(() => {
    // RPC may not exist yet — silent fallback
  });
}

// ── Full Resolution Pipeline ──

/**
 * Resolve any CanonicalPlace into a fully enriched ResolvedAddress.
 * This is the single pipeline entry point for all address flows.
 */
export async function resolveAddress(place: CanonicalPlace): Promise<ResolvedAddress> {
  // 1. Upsert into dictionary
  const row = await upsertCanonicalPlace(place);
  const placeId = row?.id ?? place.id ?? "";

  // 2. Compute zone key
  const zoneKey = buildZoneKey(
    place.country_code,
    place.city ?? "unknown",
    place.district ?? undefined,
  );

  // 3. Build resolved output
  return {
    canonical_place_id: placeId,
    formatted_address: place.formatted_address,
    short_label: place.label,
    country_code: place.country_code,
    city: place.city ?? null,
    district: place.district ?? null,
    street: null,
    building: null,
    lat: place.lat,
    lng: place.lng,
    timezone: place.timezone ?? null,
    place_type: place.place_type,
    zone_key: zoneKey,
    confidence_score: place.provider_place_id ? 0.95 : 0.7,
  };
}

/**
 * Resolve and set as active context for a user.
 * Full pipeline: resolve → save → set active → emit events.
 */
export async function resolveAndActivate(params: {
  userId: string;
  place: CanonicalPlace;
  source: "gps" | "saved" | "manual" | "recent";
  contextType?: string;
}): Promise<ResolvedAddress> {
  const resolved = await resolveAddress(params.place);

  // Set active context
  await setActiveAddressContext({
    userId: params.userId,
    canonicalPlaceId: resolved.canonical_place_id,
    source: params.source,
    lat: resolved.lat,
    lng: resolved.lng,
    countryCode: resolved.country_code,
    city: resolved.city ?? undefined,
    district: resolved.district ?? undefined,
  });

  // Track usage
  if (params.contextType) {
    await trackAddressUsage({
      userId: params.userId,
      canonicalPlaceId: resolved.canonical_place_id,
      contextType: params.contextType,
      actionType: "selected",
    });
  }

  return resolved;
}

// ── Category-specific address helpers ──

/** For food/grocery: get user's active delivery address */
export async function getDeliveryAddress(userId: string): Promise<ResolvedAddress | null> {
  const ctx = await getActiveAddressContext(userId);
  if (!ctx?.canonical_place_id) return null;

  const place = await getCanonicalPlace(ctx.canonical_place_id);
  if (!place) return null;

  const zoneKey = buildZoneKey(
    place.country_code,
    place.city ?? "unknown",
    place.district ?? undefined,
  );

  return {
    canonical_place_id: place.id,
    formatted_address: place.formatted_address,
    short_label: place.short_label,
    country_code: place.country_code,
    city: place.city,
    district: place.district,
    street: place.street,
    building: place.building,
    lat: Number(place.lat),
    lng: Number(place.lng),
    timezone: place.timezone,
    place_type: place.place_type,
    zone_key: zoneKey,
    confidence_score: 0.9,
  };
}

/** For taxi: get priority addresses (current, home, work, airports) */
export async function getTaxiAddressPriorities(userId: string): Promise<UserSavedAddress[]> {
  const saved = await getUserSavedAddresses(userId);
  // Sort: home first, work second, rest by recency
  return saved.sort((a, b) => {
    if (a.label === "home") return -1;
    if (b.label === "home") return 1;
    if (a.label === "work") return -1;
    if (b.label === "work") return 1;
    return 0;
  });
}
