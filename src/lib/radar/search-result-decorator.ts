/**
 * Search Result Decorator — Enriches place search results with live ETA + context.
 * 
 * Every search result becomes a "Geo Business Station" with:
 * - canonical_place_id, label, formatted_address, zone_key, lat, lng
 * - eta_projection: { food, grocery, taxi, parcel }
 * - live_context: { traffic, weather, merchant_count, rider_supply }
 * 
 * Flow: Canonical Resolver → Zone Overlay → ETA Projection → Decorated Result
 */
import type { CanonicalPlaceRow } from "@/lib/address/canonical-address-resolver";
import { computeZoneKey } from "@/lib/address/canonical-place";
import { getZoneOverlay, getMultipleZoneOverlays, type ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";
import { projectETAs, overlayToStation, type ETAProjection } from "@/lib/radar/eta-projection-engine";

// ── Types ──

export interface DecoratedSearchResult {
  canonical_place_id: string;
  label: string;
  formatted_address: string;
  zone_key: string;
  lat: number;
  lng: number;
  place_type: string;
  district: string | null;
  city: string | null;
  country_code: string;
  eta_projection: ETAProjection;
  live_context: {
    traffic: string | null;
    weather: string | null;
    merchant_count: number;
    rider_supply: number;
    demand_level: number;
    surge_multiplier: number;
  };
}

// ── Decorate a single result ──

export function decorateResult(
  place: CanonicalPlaceRow,
  overlay: ZoneOverlay | null,
): DecoratedSearchResult {
  const zoneKey = place.zone_key ?? computeZoneKey(place.country_code, place.city, place.district);

  const etaProjection: ETAProjection = overlay
    ? projectETAs(overlayToStation(overlay))
    : { food: null, grocery: null, taxi: null, parcel: null };

  return {
    canonical_place_id: place.id,
    label: place.short_label ?? place.formatted_address,
    formatted_address: place.formatted_address,
    zone_key: zoneKey,
    lat: Number(place.lat),
    lng: Number(place.lng),
    place_type: place.place_type,
    district: place.district,
    city: place.city,
    country_code: place.country_code,
    eta_projection: etaProjection,
    live_context: {
      traffic: overlay?.traffic_level ?? null,
      weather: overlay?.weather_type ?? null,
      merchant_count: overlay?.merchant_count ?? 0,
      rider_supply: overlay?.rider_supply ?? 0,
      demand_level: overlay?.demand_level ?? 0,
      surge_multiplier: (overlay as any)?.surge_multiplier ?? 1,
    },
  };
}

// ── Decorate batch of results (single DB call for overlays) ──

export async function decorateSearchResults(
  places: CanonicalPlaceRow[],
): Promise<DecoratedSearchResult[]> {
  if (!places.length) return [];

  // Collect unique zone keys
  const zoneKeys = [...new Set(
    places.map(p => p.zone_key ?? computeZoneKey(p.country_code, p.city, p.district))
  )];

  // Fetch all overlays in one call
  const overlays = await getMultipleZoneOverlays(zoneKeys);
  const overlayMap = new Map(overlays.map(o => [o.zone_key, o]));

  return places.map(place => {
    const zk = place.zone_key ?? computeZoneKey(place.country_code, place.city, place.district);
    return decorateResult(place, overlayMap.get(zk) ?? null);
  });
}

// ── Format ETA for display ──

export function formatETAChips(projection: ETAProjection): Array<{
  category: string;
  emoji: string;
  label: string;
  minutes: number;
}> {
  const chips: Array<{ category: string; emoji: string; label: string; minutes: number }> = [];

  if (projection.taxi != null) chips.push({ category: "taxi", emoji: "🚕", label: "Taxi", minutes: projection.taxi });
  if (projection.food != null) chips.push({ category: "food", emoji: "🍽️", label: "Food", minutes: projection.food });
  if (projection.grocery != null) chips.push({ category: "grocery", emoji: "🛒", label: "Grocery", minutes: projection.grocery });
  if (projection.parcel != null) chips.push({ category: "parcel", emoji: "📦", label: "Parcel", minutes: projection.parcel });

  return chips;
}
