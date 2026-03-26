/**
 * Radar Place Search Adapter
 * ==========================
 * Connects place search → canonical resolver → viewport → live overlays → radar refresh.
 * 
 * Flow: search query → canonical resolver → ranked results → selected place
 *       → load viewport → set radar context → fetch live overlays → update map
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";
import {
  searchCanonicalPlaces,
  type CanonicalPlaceRow,
} from "@/lib/address/canonical-address-resolver";
import { computeZoneKey } from "@/lib/address/canonical-place";

// ── Types ──

export interface PlaceViewport {
  center_lat: number;
  center_lng: number;
  viewport_north: number | null;
  viewport_south: number | null;
  viewport_east: number | null;
  viewport_west: number | null;
  recommended_zoom: number;
  polygon_geojson: Record<string, unknown> | null;
}

export interface ZoneOverlay {
  zone_key: string;
  traffic_level: string | null;
  traffic_speed_factor: number;
  weather_type: string | null;
  weather_intensity: number;
  flood_risk_level: string | null;
  demand_level: number;
  rider_supply: number;
  merchant_count: number;
  avg_food_eta_minutes: number | null;
  avg_taxi_eta_minutes: number | null;
  avg_parcel_eta_minutes: number | null;
  updated_at: string;
}

export interface RadarPlaceSelection {
  canonical_place_id: string;
  label: string;
  formatted_address: string;
  lat: number;
  lng: number;
  zone_key: string;
  place_type: string;
  viewport: PlaceViewport | null;
  overlay: ZoneOverlay | null;
}

// ── Viewport ──

export async function getPlaceViewport(canonicalPlaceId: string): Promise<PlaceViewport | null> {
  const { data } = await (supabase as any)
    .from("canonical_place_viewports")
    .select("*")
    .eq("canonical_place_id", canonicalPlaceId)
    .maybeSingle();
  return data;
}

export async function upsertPlaceViewport(
  canonicalPlaceId: string,
  viewport: Omit<PlaceViewport, "polygon_geojson"> & { polygon_geojson?: Record<string, unknown> | null }
): Promise<void> {
  await (supabase as any)
    .from("canonical_place_viewports")
    .upsert({
      canonical_place_id: canonicalPlaceId,
      ...viewport,
      updated_at: new Date().toISOString(),
    }, { onConflict: "canonical_place_id" });
}

// ── Zone Overlays ──

export async function getZoneOverlay(zoneKey: string): Promise<ZoneOverlay | null> {
  const { data } = await (supabase as any)
    .from("geo_live_zone_overlays")
    .select("*")
    .eq("zone_key", zoneKey)
    .maybeSingle();
  return data;
}

export async function getMultipleZoneOverlays(zoneKeys: string[]): Promise<ZoneOverlay[]> {
  if (!zoneKeys.length) return [];
  const { data } = await (supabase as any)
    .from("geo_live_zone_overlays")
    .select("*")
    .in("zone_key", zoneKeys);
  return data ?? [];
}

// ── Search + Select Pipeline ──

export async function searchRadarPlaces(params: {
  query: string;
  countryCode?: string;
  city?: string;
  userId?: string;
  limit?: number;
}): Promise<CanonicalPlaceRow[]> {
  return searchCanonicalPlaces({
    query: params.query,
    countryCode: params.countryCode,
    city: params.city,
    limit: params.limit ?? 8,
    userId: params.userId,
  });
}

/**
 * Full place selection pipeline:
 * 1. Load viewport for the place
 * 2. Compute zone_key
 * 3. Fetch live zone overlays
 * 4. Emit radar.place.selected event
 * 5. Return full selection context
 */
export async function selectRadarPlace(place: CanonicalPlaceRow): Promise<RadarPlaceSelection> {
  const zoneKey = place.zone_key ?? computeZoneKey(place.country_code, place.city, place.district);

  // Load viewport + overlay in parallel
  const [viewport, overlay] = await Promise.all([
    getPlaceViewport(place.id),
    getZoneOverlay(zoneKey),
  ]);

  // Build a default viewport from lat/lng if none stored
  const effectiveViewport: PlaceViewport = viewport ?? {
    center_lat: Number(place.lat),
    center_lng: Number(place.lng),
    viewport_north: null,
    viewport_south: null,
    viewport_east: null,
    viewport_west: null,
    recommended_zoom: placeTypeToZoom(place.place_type),
    polygon_geojson: null,
  };

  const selection: RadarPlaceSelection = {
    canonical_place_id: place.id,
    label: place.short_label ?? place.formatted_address,
    formatted_address: place.formatted_address,
    lat: Number(place.lat),
    lng: Number(place.lng),
    zone_key: zoneKey,
    place_type: place.place_type,
    viewport: effectiveViewport,
    overlay,
  };

  // Emit the canonical event
  eventBus.emit("radar.place.selected", {
    canonical_place_id: selection.canonical_place_id,
    label: selection.label,
    lat: selection.lat,
    lng: selection.lng,
    zone_key: selection.zone_key,
    viewport: {
      north: effectiveViewport.viewport_north,
      south: effectiveViewport.viewport_south,
      east: effectiveViewport.viewport_east,
      west: effectiveViewport.viewport_west,
      zoom: effectiveViewport.recommended_zoom,
    },
  });

  // Also trigger downstream refreshes
  eventBus.emit("radar.context.refresh", { zoneKey, lat: selection.lat, lng: selection.lng });
  eventBus.emit("eta.context.refresh", { zoneKey });
  eventBus.emit("merchant.visibility.refresh", { zoneKey });

  return selection;
}

// ── Helpers ──

function placeTypeToZoom(placeType: string): number {
  switch (placeType) {
    case "country": return 6;
    case "city": return 12;
    case "district": return 14;
    case "airport": return 15;
    case "mall": case "hospital": case "station": return 16;
    case "tower": case "building": return 17;
    default: return 14;
  }
}
