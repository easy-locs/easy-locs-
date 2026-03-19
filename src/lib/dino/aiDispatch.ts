/**
 * DINO — AI Dispatch Engine
 * Smart driver scoring, assignment, ETA computation, batch optimization.
 * Uses existing driver_profiles and delivery_jobs tables.
 */

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { findAvailableDrivers } from "./driverEngine";

// =============================
// TYPES
// =============================

export interface DispatchDriver {
  id: string;
  user_id: string;
  city: string | null;
  vehicle_type: string | null;
  rating: number | null;
  reliability_score: number | null;
  current_lat: number | null;
  current_lng: number | null;
  active_jobs?: number;
  distance_km?: number;
  route_zone?: string;
}

export interface DispatchOrder {
  id: string;
  city: string;
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  zone?: string;
}

export interface AssignmentResult {
  driver: DispatchDriver & { aiScore: number };
  etaMinutes: number;
  batched: boolean;
}

// =============================
// 1) DRIVER SCORING
// =============================

export function scoreDriver(driver: DispatchDriver, order: DispatchOrder): number {
  const distanceKm = driver.distance_km ?? estimateDistance(
    driver.current_lat ?? 0, driver.current_lng ?? 0,
    order.pickupLat, order.pickupLng
  );

  const distanceScore = Math.max(0, 100 - distanceKm * 15);
  const ratingScore = (driver.rating ?? 4) * 20;
  const reliabilityScore = (driver.reliability_score ?? 50);
  const workloadPenalty = (driver.active_jobs ?? 0) * -10;

  return (
    distanceScore * 0.35 +
    ratingScore * 0.25 +
    reliabilityScore * 0.25 +
    workloadPenalty * 0.15
  );
}

// =============================
// 2) BEST DRIVER SELECTION
// =============================

export function selectBestDriver(
  order: DispatchOrder,
  drivers: DispatchDriver[]
): (DispatchDriver & { aiScore: number }) | null {
  if (!drivers.length) return null;

  return drivers
    .map(d => ({
      ...d,
      distance_km: d.distance_km ?? estimateDistance(
        d.current_lat ?? 0, d.current_lng ?? 0,
        order.pickupLat, order.pickupLng
      ),
      aiScore: scoreDriver(d, order),
    }))
    .sort((a, b) => b.aiScore - a.aiScore)[0];
}

// =============================
// 3) ETA COMPUTATION
// =============================

export function computeETA(distanceKm: number, trafficLevel: number = 0.3): number {
  const baseSpeed = 30; // km/h average urban delivery
  const trafficFactor = 1 + Math.min(trafficLevel, 1) * 0.5;
  const timeHours = distanceKm / baseSpeed;
  return Math.max(3, Math.round(timeHours * 60 * trafficFactor));
}

// =============================
// 4) BATCH ORDER CHECK
// =============================

export function canBatchOrder(
  driver: DispatchDriver,
  newOrder: DispatchOrder,
  maxActiveJobs = 2
): boolean {
  return (
    (driver.active_jobs ?? 0) < maxActiveJobs &&
    (driver.route_zone ?? "") === (newOrder.zone ?? "")
  );
}

// =============================
// 5) ORDER ASSIGNMENT
// =============================

export function assignOrder(
  order: DispatchOrder,
  drivers: DispatchDriver[]
): (DispatchDriver & { aiScore: number }) | null {
  // Prefer batchable drivers first
  const batchable = drivers.filter(d => canBatchOrder(d, order));
  if (batchable.length > 0) {
    return selectBestDriver(order, batchable);
  }
  return selectBestDriver(order, drivers);
}

// =============================
// 6) ROUTE OPTIMIZATION
// =============================

export interface RouteStop {
  lat: number;
  lng: number;
  type: "pickup" | "dropoff";
  orderId: string;
  distance?: number;
}

export function optimizeRoute(stops: RouteStop[], originLat: number, originLng: number): RouteStop[] {
  return stops
    .map(s => ({
      ...s,
      distance: s.distance ?? estimateDistance(originLat, originLng, s.lat, s.lng),
    }))
    .sort((a, b) => a.distance - b.distance);
}

// =============================
// 7) FULL AI DELIVERY PIPELINE
// =============================

export async function runAIDelivery(order: DispatchOrder): Promise<AssignmentResult | null> {
  // 1) Get available drivers
  const rawDrivers = await findAvailableDrivers(order.city, 20);
  const drivers: DispatchDriver[] = rawDrivers.map(d => ({
    ...d,
    active_jobs: 0,
    distance_km: estimateDistance(
      d.current_lat ?? 0, d.current_lng ?? 0,
      order.pickupLat, order.pickupLng
    ),
  }));

  if (!drivers.length) return null;

  // 2) Select best driver (batch-aware)
  const driver = assignOrder(order, drivers);
  if (!driver) return null;

  const batched = canBatchOrder(driver, order);

  // 3) Compute ETA
  const etaMinutes = computeETA(driver.distance_km ?? 5);

  // 4) Record learning event
  await supabase.from("dino_learning_events").insert([{
    event_type: "delivery_assigned",
    entity_id: order.id,
    entity_type: "order",
    metric: "eta",
    metadata_json: {
      driverId: driver.id,
      aiScore: driver.aiScore,
      distanceKm: driver.distance_km,
      batched,
    } as unknown as Json,
    new_value: etaMinutes,
    previous_value: 0,
  }]);

  return { driver, etaMinutes, batched };
}

// =============================
// UTILS
// =============================

/** Haversine distance approximation in km */
function estimateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
