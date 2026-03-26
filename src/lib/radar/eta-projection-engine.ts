/**
 * ETA Projection Engine — Computes projected ETA per category for a place/zone.
 * 
 * Inputs: zone_key, traffic, weather, merchants, rider supply, prep time averages
 * Output: { food, grocery, taxi, parcel } ETA projections
 * 
 * Flow: Geo Live Station → ETA Projection → Search Result Decorator → UI
 */
import { supabase } from "@/integrations/supabase/client";
import type { ZoneOverlay } from "@/lib/radar/radar-place-search-adapter";

// ── Types ──

export interface ETAProjection {
  food: number | null;
  grocery: number | null;
  taxi: number | null;
  parcel: number | null;
}

export interface GeoLiveStation {
  zone_key: string;
  weather_type: string | null;
  weather_intensity: number;
  traffic_level: string | null;
  traffic_speed_factor: number;
  rider_supply: number;
  rider_supply_factor: number;
  merchant_count: number;
  merchant_open_count: number;
  merchant_deliverable_count: number;
  avg_food_eta_minutes: number | null;
  avg_grocery_eta_minutes: number | null;
  avg_taxi_eta_minutes: number | null;
  avg_parcel_eta_minutes: number | null;
  demand_level: number;
  demand_multiplier: number;
  surge_multiplier: number;
  flood_risk_level: string | null;
  updated_at: string;
}

// ── Defaults ──

const BASE_ETA: Record<string, number> = {
  food: 25,
  grocery: 30,
  taxi: 6,
  parcel: 35,
};

const PREP_TIME: Record<string, number> = {
  food: 12,
  grocery: 8,
  taxi: 0,
  parcel: 5,
};

// ── Core: project ETA from live station data ──

export function projectETAs(station: GeoLiveStation): ETAProjection {
  const trafficFactor = Math.max(0.3, station.traffic_speed_factor);
  const weatherPenalty = station.weather_intensity > 0.5 ? 1 + station.weather_intensity * 0.3 : 1.0;
  const supplyFactor = station.rider_supply_factor > 0 ? station.rider_supply_factor : 1.0;

  // Rider scarcity penalty: fewer riders = longer wait
  const riderWait = station.rider_supply > 0
    ? Math.max(0, 5 - Math.min(5, station.rider_supply / 3))
    : 5;

  const compute = (category: string, stationEta: number | null): number | null => {
    // If station has precomputed avg, use it as base
    const base = stationEta ?? BASE_ETA[category] ?? 20;
    const prep = PREP_TIME[category] ?? 0;

    // Traffic slows travel proportionally
    const travelTime = (base - prep) / trafficFactor;
    const adjusted = prep + travelTime * weatherPenalty + riderWait / supplyFactor;

    return Math.max(1, Math.round(adjusted));
  };

  return {
    food: compute("food", station.avg_food_eta_minutes),
    grocery: compute("grocery", station.avg_grocery_eta_minutes),
    taxi: compute("taxi", station.avg_taxi_eta_minutes),
    parcel: compute("parcel", station.avg_parcel_eta_minutes),
  };
}

// ── Convert ZoneOverlay to GeoLiveStation ──

export function overlayToStation(overlay: ZoneOverlay): GeoLiveStation {
  return {
    zone_key: overlay.zone_key,
    weather_type: overlay.weather_type,
    weather_intensity: overlay.weather_intensity ?? 0,
    traffic_level: overlay.traffic_level,
    traffic_speed_factor: overlay.traffic_speed_factor ?? 1,
    rider_supply: overlay.rider_supply ?? 0,
    rider_supply_factor: (overlay as any).rider_supply_factor ?? 1,
    merchant_count: overlay.merchant_count ?? 0,
    merchant_open_count: (overlay as any).merchant_open_count ?? overlay.merchant_count ?? 0,
    merchant_deliverable_count: (overlay as any).merchant_deliverable_count ?? overlay.merchant_count ?? 0,
    avg_food_eta_minutes: overlay.avg_food_eta_minutes,
    avg_grocery_eta_minutes: (overlay as any).avg_grocery_eta_minutes ?? null,
    avg_taxi_eta_minutes: overlay.avg_taxi_eta_minutes,
    avg_parcel_eta_minutes: overlay.avg_parcel_eta_minutes,
    demand_level: overlay.demand_level ?? 0,
    demand_multiplier: (overlay as any).demand_multiplier ?? 1,
    surge_multiplier: (overlay as any).surge_multiplier ?? 1,
    flood_risk_level: overlay.flood_risk_level,
    updated_at: overlay.updated_at,
  };
}

// ── Fetch full station from DB ──

export async function fetchGeoLiveStation(zoneKey: string): Promise<GeoLiveStation | null> {
  const { data } = await (supabase as any)
    .from("geo_live_zone_overlays")
    .select("*")
    .eq("zone_key", zoneKey)
    .maybeSingle();
  return data ? overlayToStation(data) : null;
}

// ── Cache ETA projection ──

export async function cacheETAProjection(params: {
  zoneKey: string;
  canonicalPlaceId?: string;
  projection: ETAProjection;
  trafficFactor?: number;
  weatherFactor?: number;
  riderSupplyFactor?: number;
  merchantCount?: number;
}): Promise<void> {
  const rows = (["food", "grocery", "taxi", "parcel"] as const)
    .filter(cat => params.projection[cat] != null)
    .map(cat => ({
      zone_key: params.zoneKey,
      canonical_place_id: params.canonicalPlaceId ?? null,
      category: cat,
      eta_minutes: params.projection[cat]!,
      traffic_factor: params.trafficFactor ?? 1,
      weather_factor: params.weatherFactor ?? 1,
      rider_supply_factor: params.riderSupplyFactor ?? 1,
      merchant_count: params.merchantCount ?? 0,
      confidence: 0.75,
    }));

  if (rows.length > 0) {
    await (supabase as any).from("eta_projection_cache").insert(rows);
  }
}

// ── Get cached projection for a zone ──

export async function getCachedETAProjection(zoneKey: string): Promise<ETAProjection | null> {
  const { data } = await (supabase as any)
    .from("eta_projection_cache")
    .select("category, eta_minutes")
    .eq("zone_key", zoneKey)
    .gte("expires_at", new Date().toISOString())
    .order("computed_at", { ascending: false })
    .limit(4);

  if (!data?.length) return null;

  const projection: ETAProjection = { food: null, grocery: null, taxi: null, parcel: null };
  for (const row of data) {
    if (row.category in projection) {
      (projection as any)[row.category] = Number(row.eta_minutes);
    }
  }
  return projection;
}
