/**
 * Geo Sync Engine — Synchronizes address contexts across the platform.
 * 
 * Responsibilities:
 * - Sync active address context per category
 * - Sync GPS position without overwriting saved addresses
 * - Sync zone_key changes
 * - Invalidate stale ETA caches
 * - Emit events for radar/merchant/dispatch refresh
 * 
 * RULE: GPS updates inform global context but never override category-specific contexts.
 */
import { eventBus } from "@/lib/core/event-bus";
import { setActiveAddressContext, getActiveAddressContext } from "./canonical-address-resolver";
import { fromGPS, computeZoneKey, type AddressContextType } from "./canonical-place";
import { reverseGeocode } from "@/lib/location/geocode";

/**
 * Sync GPS position to global context only.
 * Does NOT overwrite food_delivery, taxi_pickup, etc.
 */
export async function syncGPSToGlobal(userId: string, lat: number, lng: number): Promise<void> {
  try {
    const reverseResult = await reverseGeocode(lat, lng);
    const place = fromGPS(lat, lng, {
      label: reverseResult.label,
      city: reverseResult.city,
      district: reverseResult.area,
      country: reverseResult.country,
      street: reverseResult.street,
    });

    const currentGlobal = await getActiveAddressContext(userId, "global");
    // Only update if no saved address is active in global
    if (!currentGlobal || currentGlobal.source_type === "gps" || currentGlobal.source === "gps") {
      await setActiveAddressContext({
        userId,
        contextType: "global",
        canonicalPlaceId: null, // GPS doesn't always create canonical records
        sourceType: "gps",
        lat,
        lng,
        countryCode: place.country_code,
        city: place.city ?? undefined,
        district: place.district ?? undefined,
        zoneKey: place.zone_key ?? undefined,
      });
    }
  } catch (e) {
    console.error("[geo-sync] GPS sync failed:", e);
  }
}

/**
 * Get the effective address for a given category.
 * Falls back: category-specific → global.
 */
export async function getEffectiveContext(userId: string, contextType: AddressContextType): Promise<{
  lat: number; lng: number; zoneKey: string; contextType: string;
} | null> {
  const specific = await getActiveAddressContext(userId, contextType);
  if (specific?.lat && specific?.lng) {
    return {
      lat: Number(specific.lat),
      lng: Number(specific.lng),
      zoneKey: specific.zone_key ?? computeZoneKey(specific.country_code ?? "AE", specific.city, specific.district),
      contextType,
    };
  }

  const global = await getActiveAddressContext(userId, "global");
  if (global?.lat && global?.lng) {
    return {
      lat: Number(global.lat),
      lng: Number(global.lng),
      zoneKey: global.zone_key ?? computeZoneKey(global.country_code ?? "AE", global.city, global.district),
      contextType: "global",
    };
  }

  return null;
}

/**
 * Listen for address context changes and propagate to dependent systems.
 */
export function initGeoSyncListeners(): () => void {
  const unsub = eventBus.on("address.context.updated", (payload: any) => {
    // Propagate to ETA, dispatch, merchant visibility
    eventBus.emit("dispatch.context.refresh", { userId: payload.userId, zoneKey: payload.zoneKey });
  });
  return unsub;
}
