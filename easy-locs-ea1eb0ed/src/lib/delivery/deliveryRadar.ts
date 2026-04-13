/**
 * deliveryRadar — Delivery mission management: create, broadcast, accept, track.
 * Uses delivery_missions table + driver_locations for proximity matching.
 */
import { db } from "@/services/db";



/* ── Haversine distance (km) ── */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/* ── Pricing engine ── */
export function computeDeliveryPrice(distanceKm: number, currency = "AED"): number {
  const baseFee = currency === "AED" ? 5 : 3;
  const perKm = currency === "AED" ? 2 : 1.5;
  return Math.round((baseFee + distanceKm * perKm) * 100) / 100;
}

/* ── Create delivery mission from a paid order ── */
export async function createDeliveryMission(params: {
  orderId: string;
  sellerId: string;
  sellerShopId?: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropLat: number;
  dropLng: number;
  dropAddress?: string;
  currency?: string;
}) {
  const distanceKm = haversineKm(params.pickupLat, params.pickupLng, params.dropLat, params.dropLng);
  const price = computeDeliveryPrice(distanceKm, params.currency);

  const { data, error } = await db
    .from("delivery_missions")
    .insert({
      order_id: params.orderId,
      seller_id: params.sellerId,
      seller_shop_id: params.sellerShopId ?? null,
      pickup_lat: params.pickupLat,
      pickup_lng: params.pickupLng,
      pickup_address: params.pickupAddress ?? null,
      drop_lat: params.dropLat,
      drop_lng: params.dropLng,
      drop_address: params.dropAddress ?? null,
      price,
      currency: params.currency ?? "AED",
      status: "open",
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/* ── Find nearby drivers ── */
export async function findNearbyDrivers(params: {
  pickupLat: number;
  pickupLng: number;
  radiusKm?: number;
}): Promise<Array<{ driver_id: string; lat: number; lng: number; distanceKm: number }>> {
  const radius = params.radiusKm ?? 5;

  // Fetch active drivers with locations
  const { data: locations, error } = await db
    .from("driver_locations")
    .select("driver_id, lat, lng");

  if (error || !locations) return [];

  // Filter by distance and sort
  return (locations as any[])
    .map((loc: any) => ({
      driver_id: loc.driver_id,
      lat: loc.lat,
      lng: loc.lng,
      distanceKm: haversineKm(params.pickupLat, params.pickupLng, loc.lat, loc.lng),
    }))
    .filter((d) => d.distanceKm <= radius)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/* ── Atomic accept (first driver wins) ── */
export async function acceptDeliveryMission(params: {
  missionId: string;
  driverId: string;
}): Promise<{ accepted: boolean; mission?: any }> {
  const { data, error } = await db
    .from("delivery_missions")
    .update({
      assigned_driver_id: params.driverId,
      status: "accepted",
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.missionId)
    .eq("status", "open") // Atomic: only succeeds if still open
    .select("*")
    .single();

  if (error || !data) return { accepted: false };
  return { accepted: true, mission: data };
}

/* ── Update mission status ── */
export async function updateMissionStatus(
  missionId: string,
  status: "picked_up" | "delivered" | "cancelled",
  extra?: { cancelReason?: string },
) {
  const updates: Record<string, any> = {
    status,
    updated_at: new Date().toISOString(),
  };

  if (status === "picked_up") updates.picked_up_at = new Date().toISOString();
  if (status === "delivered") updates.delivered_at = new Date().toISOString();
  if (status === "cancelled") {
    updates.cancelled_at = new Date().toISOString();
    updates.cancel_reason = extra?.cancelReason ?? null;
  }

  const { data, error } = await db
    .from("delivery_missions")
    .update(updates)
    .eq("id", missionId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

/* ── Update driver location ── */
export async function upsertDriverLocation(params: {
  driverId: string;
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
}) {
  const { error } = await db
    .from("driver_locations")
    .upsert(
      {
        driver_id: params.driverId,
        lat: params.lat,
        lng: params.lng,
        heading: params.heading ?? null,
        speed_kmh: params.speed ?? null,
        accuracy_m: params.accuracy ?? null,
        recorded_at: new Date().toISOString(),
      },
      { onConflict: "driver_id" },
    );

  if (error) console.error("upsertDriverLocation", error);
}

/* ── Get mission by ID ── */
export async function getDeliveryMission(missionId: string) {
  const { data, error } = await db
    .from("delivery_missions")
    .select("*")
    .eq("id", missionId)
    .single();

  if (error) throw error;
  return data;
}

/* ── Get open missions for driver view ── */
export async function getOpenMissions() {
  const { data, error } = await db
    .from("delivery_missions")
    .select("*")
    .eq("status", "open")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw error;
  return data ?? [];
}

/* ── Get driver's active mission ── */
export async function getDriverActiveMission(driverId: string) {
  const { data, error } = await db
    .from("delivery_missions")
    .select("*")
    .eq("assigned_driver_id", driverId)
    .in("status", ["accepted", "picked_up"])
    .order("accepted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
