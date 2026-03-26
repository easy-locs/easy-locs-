/**
 * Live Mobility Context Engine
 * Canonical ETA, visibility scoring, and zone-aware merchant ranking.
 * Replaces all simplistic radius-only logic.
 */
import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";

// ── Types ──

export interface GeoLiveContext {
  zone_key: string;
  traffic_level: string;
  traffic_speed_factor: number;
  weather_type: string;
  weather_speed_factor: number;
  demand_level: string;
  demand_multiplier: number;
  rider_supply_level: string;
  rider_supply_factor: number;
}

export interface MerchantRuntime {
  merchant_id: string;
  is_open_now: boolean;
  accepting_orders: boolean;
  prep_time_minutes: number;
  queue_load: number;
  avg_handover_delay_minutes: number;
  active_orders_count: number;
  active_delivery_jobs_count: number;
  delivery_capacity_score: number;
}

export interface MerchantDeliveryZone {
  id: string;
  merchant_id: string;
  zone_type: string;
  center_lat: number | null;
  center_lng: number | null;
  radius_km: number | null;
  polygon_geojson: any;
  min_order_amount: number;
  base_delivery_fee: number;
  fee_per_km: number;
  max_eta_minutes: number;
  is_active: boolean;
}

export interface RiderRuntimeState {
  rider_user_id: string;
  is_online: boolean;
  is_available: boolean;
  current_lat: number | null;
  current_lng: number | null;
  vehicle_type: string | null;
  service_modes: string[] | null;
  acceptance_rate: number | null;
  avg_speed_kmh: number | null;
  active_job_id: string | null;
}

export interface ETAResult {
  merchant_id: string;
  estimated_prep_minutes: number;
  estimated_pickup_minutes: number;
  estimated_travel_minutes: number;
  estimated_total_minutes: number;
  traffic_factor: number;
  weather_factor: number;
  demand_factor: number;
  rider_supply_factor: number;
}

export interface MerchantVisibility {
  merchant_id: string;
  delivers_here: boolean;
  is_open: boolean;
  eta_minutes: number | null;
  delivery_fee: number;
  min_order: number;
  visibility_score: number;
  zone: MerchantDeliveryZone | null;
}

// ── Constants ──

const DEFAULT_RIDER_SPEED_KMH = 25;
const DEFAULT_PREP_MINUTES = 15;
const DEFAULT_HANDOVER_MINUTES = 2;

// ── Data Fetchers ──

export async function fetchGeoLiveContext(zoneKey: string): Promise<GeoLiveContext | null> {
  const { data } = await (supabase as any)
    .from("geo_live_context")
    .select("*")
    .eq("zone_key", zoneKey)
    .maybeSingle();
  return data;
}

export async function fetchMerchantRuntime(merchantId: string): Promise<MerchantRuntime | null> {
  const { data } = await (supabase as any)
    .from("merchant_delivery_runtime")
    .select("*")
    .eq("merchant_id", merchantId)
    .maybeSingle();
  return data;
}

export async function fetchMerchantZones(merchantId: string): Promise<MerchantDeliveryZone[]> {
  const { data } = await (supabase as any)
    .from("merchant_delivery_zones")
    .select("*")
    .eq("merchant_id", merchantId)
    .eq("is_active", true);
  return data ?? [];
}

export async function fetchNearbyRiders(lat: number, lng: number, radiusKm = 10): Promise<RiderRuntimeState[]> {
  const { data } = await (supabase as any)
    .from("rider_runtime_state")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true);

  if (!data) return [];

  return (data as RiderRuntimeState[]).filter((r) => {
    if (r.current_lat == null || r.current_lng == null) return false;
    return haversineKm(lat, lng, Number(r.current_lat), Number(r.current_lng)) <= radiusKm;
  });
}

// ── Core: Zone Check ──

export function isInsideDeliveryZone(
  customerLat: number,
  customerLng: number,
  zone: MerchantDeliveryZone,
): boolean {
  if (zone.zone_type === "circle" && zone.center_lat != null && zone.center_lng != null && zone.radius_km != null) {
    const dist = haversineKm(customerLat, customerLng, Number(zone.center_lat), Number(zone.center_lng));
    return dist <= Number(zone.radius_km);
  }
  // For district matching or polygon — simplified point-in-bbox fallback
  // Full polygon check would need turf.js; for now circle is primary
  return false;
}

// ── Core: ETA Calculation ──

export function computeETA(params: {
  merchantLat: number;
  merchantLng: number;
  customerLat: number;
  customerLng: number;
  riderLat?: number | null;
  riderLng?: number | null;
  prepMinutes?: number;
  handoverMinutes?: number;
  riderSpeedKmh?: number;
  trafficFactor?: number;
  weatherFactor?: number;
}): ETAResult {
  const {
    merchantLat, merchantLng, customerLat, customerLng,
    riderLat, riderLng,
    prepMinutes = DEFAULT_PREP_MINUTES,
    handoverMinutes = DEFAULT_HANDOVER_MINUTES,
    riderSpeedKmh = DEFAULT_RIDER_SPEED_KMH,
    trafficFactor = 1.0,
    weatherFactor = 1.0,
  } = params;

  const speedFactor = Math.max(0.3, trafficFactor * weatherFactor);
  const effectiveSpeed = riderSpeedKmh * speedFactor;

  // Rider → Merchant
  let riderToMerchantKm = 0;
  if (riderLat != null && riderLng != null) {
    riderToMerchantKm = haversineKm(Number(riderLat), Number(riderLng), merchantLat, merchantLng);
  }
  const pickupMinutes = Math.round((riderToMerchantKm / effectiveSpeed) * 60);

  // Merchant → Customer
  const merchantToCustomerKm = haversineKm(merchantLat, merchantLng, customerLat, customerLng);
  const travelMinutes = Math.round((merchantToCustomerKm / effectiveSpeed) * 60);

  const totalMinutes = prepMinutes + pickupMinutes + handoverMinutes + travelMinutes;

  return {
    merchant_id: "",
    estimated_prep_minutes: prepMinutes,
    estimated_pickup_minutes: pickupMinutes,
    estimated_travel_minutes: travelMinutes,
    estimated_total_minutes: totalMinutes,
    traffic_factor: trafficFactor,
    weather_factor: weatherFactor,
    demand_factor: 1.0,
    rider_supply_factor: 1.0,
  };
}

// ── Core: Visibility Score ──

export function computeVisibilityScore(params: {
  deliversHere: boolean;
  isOpen: boolean;
  etaMinutes: number | null;
  rating?: number;
  queueLoad?: number;
  riderSupplyFactor?: number;
  hasPromo?: boolean;
  trafficFactor?: number;
  weatherFactor?: number;
  capacityScore?: number;
}): number {
  const {
    deliversHere, isOpen, etaMinutes,
    rating = 4.0, queueLoad = 0,
    riderSupplyFactor = 1.0, hasPromo = false,
    trafficFactor = 1.0, weatherFactor = 1.0,
    capacityScore = 1.0,
  } = params;

  if (!deliversHere) return 0;
  if (!isOpen) return 5; // show but rank very low

  let score = 30; // base for open + delivers

  // ETA score (lower is better, max 25 points)
  if (etaMinutes != null) {
    score += Math.max(0, 25 - Math.floor(etaMinutes / 3));
  }

  // Rating (max 15)
  score += Math.min(15, Math.round((rating / 5) * 15));

  // Queue health (max 10, penalize overloaded)
  const queuePenalty = Math.min(10, queueLoad * 2);
  score += 10 - queuePenalty;

  // Rider supply (max 10)
  score += Math.round(Math.min(10, riderSupplyFactor * 10));

  // Promo boost
  if (hasPromo) score += 5;

  // Capacity
  score += Math.round(Math.min(5, capacityScore * 5));

  // Penalties
  if (trafficFactor < 0.6) score -= 5;
  if (weatherFactor < 0.7) score -= 5;

  return Math.max(0, Math.min(100, score));
}

// ── Core: Full Merchant Ranking Pipeline ──

export async function rankMerchantsForCustomer(params: {
  customerLat: number;
  customerLng: number;
  zoneKey?: string;
  merchantIds: string[];
  merchantLocations: Record<string, { lat: number; lng: number; rating?: number }>;
}): Promise<MerchantVisibility[]> {
  const { customerLat, customerLng, zoneKey, merchantIds, merchantLocations } = params;

  // Fetch zone context
  const geoCtx = zoneKey ? await fetchGeoLiveContext(zoneKey) : null;
  const trafficFactor = geoCtx?.traffic_speed_factor ?? 1.0;
  const weatherFactor = geoCtx?.weather_speed_factor ?? 1.0;

  // Fetch nearby riders once
  const riders = await fetchNearbyRiders(customerLat, customerLng, 15);
  const closestRider = riders.length > 0
    ? riders.reduce((best, r) => {
        if (r.current_lat == null || r.current_lng == null) return best;
        const dist = haversineKm(Number(r.current_lat), Number(r.current_lng), customerLat, customerLng);
        if (!best || dist < best.dist) return { rider: r, dist };
        return best;
      }, null as { rider: RiderRuntimeState; dist: number } | null)
    : null;

  const results: MerchantVisibility[] = [];

  for (const mid of merchantIds) {
    const loc = merchantLocations[mid];
    if (!loc) {
      results.push({ merchant_id: mid, delivers_here: false, is_open: false, eta_minutes: null, delivery_fee: 0, min_order: 0, visibility_score: 0, zone: null });
      continue;
    }

    // Fetch merchant runtime + zones in parallel
    const [runtime, zones] = await Promise.all([
      fetchMerchantRuntime(mid),
      fetchMerchantZones(mid),
    ]);

    // Zone check
    const matchedZone = zones.find((z) => isInsideDeliveryZone(customerLat, customerLng, z)) ?? null;
    const deliversHere = matchedZone != null || zones.length === 0; // no zones = delivers everywhere
    const isOpen = runtime?.is_open_now ?? true;

    // ETA
    const eta = computeETA({
      merchantLat: loc.lat,
      merchantLng: loc.lng,
      customerLat,
      customerLng,
      riderLat: closestRider?.rider.current_lat,
      riderLng: closestRider?.rider.current_lng,
      prepMinutes: runtime?.prep_time_minutes ?? DEFAULT_PREP_MINUTES,
      handoverMinutes: runtime?.avg_handover_delay_minutes ?? DEFAULT_HANDOVER_MINUTES,
      riderSpeedKmh: closestRider?.rider.avg_speed_kmh ? Number(closestRider.rider.avg_speed_kmh) : DEFAULT_RIDER_SPEED_KMH,
      trafficFactor,
      weatherFactor,
    });

    // Delivery fee
    const distKm = haversineKm(loc.lat, loc.lng, customerLat, customerLng);
    const baseFee = matchedZone ? Number(matchedZone.base_delivery_fee) : 0;
    const perKmFee = matchedZone ? Number(matchedZone.fee_per_km) : 0;
    const deliveryFee = baseFee + perKmFee * distKm;

    // Visibility score
    const visibility = computeVisibilityScore({
      deliversHere,
      isOpen,
      etaMinutes: eta.estimated_total_minutes,
      rating: loc.rating,
      queueLoad: runtime?.queue_load ?? 0,
      riderSupplyFactor: geoCtx?.rider_supply_factor ?? 1.0,
      trafficFactor,
      weatherFactor,
      capacityScore: runtime?.delivery_capacity_score ?? 1.0,
    });

    results.push({
      merchant_id: mid,
      delivers_here: deliversHere,
      is_open: isOpen,
      eta_minutes: eta.estimated_total_minutes,
      delivery_fee: Math.round(deliveryFee * 100) / 100,
      min_order: matchedZone ? Number(matchedZone.min_order_amount) : 0,
      visibility_score: visibility,
      zone: matchedZone,
    });
  }

  // Sort by visibility score descending
  results.sort((a, b) => b.visibility_score - a.visibility_score);
  return results;
}

// ── Taxi ETA (simpler: pickup only) ──

export function computeTaxiPickupETA(params: {
  customerLat: number;
  customerLng: number;
  riderLat: number;
  riderLng: number;
  riderSpeedKmh?: number;
  trafficFactor?: number;
  weatherFactor?: number;
}): number {
  const speed = (params.riderSpeedKmh ?? 30) * (params.trafficFactor ?? 1.0) * (params.weatherFactor ?? 1.0);
  const dist = haversineKm(params.customerLat, params.customerLng, params.riderLat, params.riderLng);
  return Math.max(1, Math.round((dist / Math.max(5, speed)) * 60));
}

// ── Zone Key Builder ──

export function buildZoneKey(countryCode: string, city: string, district?: string): string {
  const parts = [countryCode.toUpperCase(), city.toUpperCase().replace(/\s+/g, "_")];
  if (district) parts.push(district.toUpperCase().replace(/\s+/g, "_"));
  return parts.join("_");
}
