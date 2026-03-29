/**
 * @deprecated — LEGACY. Use canonical-address-resolver.ts instead.
 * This file is kept only for backward compatibility during migration.
 * All new code MUST use:
 *   import { resolveAddress, resolveAndActivate } from "@/lib/address/canonical-address-resolver";
 *   import type { CanonicalPlace } from "@/lib/address/canonical-place";
 */
import { supabase } from "@/integrations/supabase/client";
import { debugLog } from "@/lib/debug/runtime-debug-bus";

export interface ResolvedAddress {
  id?: string;
  label: string;
  title?: string;
  fullAddress: string;
  building?: string;
  streetNumber?: string;
  streetName?: string;
  area?: string;
  city: string;
  country?: string;
  lat: number;
  lng: number;
  floor?: string;
  unitNumber?: string;
  landmark?: string;
  deliveryNotes?: string;
  source: "default" | "last_used" | "current_location" | "city_fallback";
}

// Dubai Marina fallback
const DUBAI_FALLBACK: ResolvedAddress = {
  label: "Dubai",
  fullAddress: "Dubai, UAE",
  city: "Dubai",
  country: "AE",
  lat: 25.2048,
  lng: 55.2708,
  source: "city_fallback",
};

function rowToAddress(row: any, source: ResolvedAddress["source"]): ResolvedAddress {
  return {
    id: row.id,
    label: row.label ?? row.title ?? "Address",
    title: row.title ?? row.label,
    fullAddress: row.full_address,
    building: row.building ?? undefined,
    streetNumber: row.street_number ?? undefined,
    streetName: row.street_name ?? undefined,
    area: row.area ?? undefined,
    city: row.city ?? "Dubai",
    country: row.country_code ?? "AE",
    lat: row.lat,
    lng: row.lng,
    floor: row.floor ?? undefined,
    unitNumber: row.unit_number ?? undefined,
    landmark: row.landmark ?? undefined,
    deliveryNotes: row.delivery_notes ?? undefined,
    source,
  };
}

// Canonical identity — use family import
import { getCurrentUserIdOrNull as getCurrentUserId } from "@/families/identity";

export async function getDefaultAddress(): Promise<ResolvedAddress | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .eq("is_default", true)
    .limit(1)
    .maybeSingle();

  if (data?.lat && data?.lng) {
    debugLog.info("address", "default_address_loaded", data.full_address);
    return rowToAddress(data, "default");
  }
  return null;
}

export async function getLastUsedAddress(): Promise<ResolvedAddress | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const { data } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .not("last_used_at", "is", null)
    .order("last_used_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (data?.lat && data?.lng) {
    debugLog.info("address", "last_used_address_loaded", data.full_address);
    return rowToAddress(data, "last_used");
  }
  return null;
}

export async function getSavedAddresses(): Promise<ResolvedAddress[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const { data } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .order("is_default", { ascending: false })
    .order("last_used_at", { ascending: false, nullsFirst: false });

  return (data ?? [])
    .filter((r: any) => r.lat && r.lng)
    .map((r: any) => rowToAddress(r, r.is_default ? "default" : "last_used"));
}

export function currentLocationToAddress(lat: number, lng: number, city?: string): ResolvedAddress {
  return {
    label: "Current Location",
    fullAddress: city || "Current Location",
    city: city || "Dubai",
    lat,
    lng,
    source: "current_location",
  };
}

/**
 * Resolve best available address with priority chain.
 */
export async function resolveBestAddress(
  geoLat?: number | null,
  geoLng?: number | null,
  geoCity?: string | null
): Promise<ResolvedAddress> {
  // 1. Default saved address
  const defaultAddr = await getDefaultAddress();
  if (defaultAddr) {
    debugLog.info("address", "address_prefill_source", "default");
    return defaultAddr;
  }

  // 2. Last used address
  const lastUsed = await getLastUsedAddress();
  if (lastUsed) {
    debugLog.info("address", "address_prefill_source", "last_used");
    return lastUsed;
  }

  // 3. Current GPS location
  if (geoLat && geoLng) {
    debugLog.info("address", "address_prefill_source", "current_location");
    return currentLocationToAddress(geoLat, geoLng, geoCity ?? undefined);
  }

  // 4. Dubai fallback
  debugLog.info("address", "address_prefill_source", "city_fallback");
  return DUBAI_FALLBACK;
}

/**
 * Touch last_used_at for an address.
 */
export async function touchAddressUsed(addressId: string) {
  await (supabase as any)
    .from("saved_addresses")
    .update({ last_used_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", addressId);
}

/**
 * Save or update an address.
 */
export async function saveAddress(params: {
  id?: string;
  label: string;
  title?: string;
  fullAddress: string;
  building?: string;
  streetNumber?: string;
  streetName?: string;
  area?: string;
  city?: string;
  countryCode?: string;
  lat: number;
  lng: number;
  floor?: string;
  unitNumber?: string;
  landmark?: string;
  deliveryNotes?: string;
  isDefault?: boolean;
}) {
  const userId = await getCurrentUserId();
  if (!userId) throw new Error("Not authenticated");

  // Clear other defaults if setting this as default
  if (params.isDefault) {
    await (supabase as any)
      .from("saved_addresses")
      .update({ is_default: false } as any)
      .eq("user_id", userId);
  }

  const row = {
    user_id: userId,
    label: params.label,
    title: params.title ?? null,
    full_address: params.fullAddress,
    building: params.building ?? null,
    street_number: params.streetNumber ?? null,
    street_name: params.streetName ?? null,
    area: params.area ?? null,
    city: params.city ?? "Dubai",
    country_code: params.countryCode ?? "AE",
    lat: params.lat,
    lng: params.lng,
    floor: params.floor ?? null,
    unit_number: params.unitNumber ?? null,
    landmark: params.landmark ?? null,
    delivery_notes: params.deliveryNotes ?? null,
    is_default: params.isDefault ?? false,
    last_used_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (params.id) {
    const { data, error } = await (supabase as any)
      .from("saved_addresses")
      .update(row)
      .eq("id", params.id)
      .select("*")
      .single();
    if (error) throw error;
    return data;
  }

  const { data, error } = await (supabase as any)
    .from("saved_addresses")
    .insert(row)
    .select("*")
    .single();
  if (error) throw error;
  return data;
}

/**
 * Search saved addresses by text.
 */
export async function searchAddresses(query: string): Promise<ResolvedAddress[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const q = `%${query}%`;
  const { data } = await (supabase as any)
    .from("saved_addresses")
    .select("*")
    .eq("user_id", userId)
    .or(`full_address.ilike.${q},building.ilike.${q},area.ilike.${q},label.ilike.${q},title.ilike.${q},landmark.ilike.${q},street_name.ilike.${q}`)
    .order("last_used_at", { ascending: false, nullsFirst: false })
    .limit(10);

  debugLog.info("address", "address_search_results", `"${query}" → ${data?.length ?? 0} results`);
  return (data ?? []).map((r: any) => rowToAddress(r, "last_used"));
}
