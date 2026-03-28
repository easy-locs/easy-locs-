import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import { APP_EVENTS } from "@/lib/platform/events";

export type DriverCandidate = {
  user_id: string;
  is_online?: boolean | null;
  is_available?: boolean | null;
  current_lat?: number | null;
  current_lng?: number | null;
  acceptance_rate?: number | null;
  reliability_score?: number | null;
  jobs_completed?: number | null;
  zone?: string | null;
};

export type MatchDriverInput = {
  orderId: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  zone?: string | null;
};

function scoreDriver(driver: DriverCandidate, pickupLat?: number | null, pickupLng?: number | null, zone?: string | null) {
  const onlineBoost = driver.is_online ? 25 : -1000;
  const availableBoost = driver.is_available ? 25 : -1000;
  const acceptance = Number(driver.acceptance_rate ?? 70) * 0.2;
  const reliability = Number(driver.reliability_score ?? 70) * 0.25;
  const jobs = Math.min(Number(driver.jobs_completed ?? 0), 500) * 0.03;

  let distanceScore = 15;
  if (
    pickupLat != null &&
    pickupLng != null &&
    driver.current_lat != null &&
    driver.current_lng != null
  ) {
    const km = haversineKm(
      Number(driver.current_lat),
      Number(driver.current_lng),
      Number(pickupLat),
      Number(pickupLng)
    );
    distanceScore = Math.max(0, 40 - km * 6);
  }

  const zoneBoost =
    zone && driver.zone && String(driver.zone).toLowerCase() === String(zone).toLowerCase()
      ? 18
      : 0;

  return onlineBoost + availableBoost + acceptance + reliability + jobs + distanceScore + zoneBoost;
}

export async function getAvailableDrivers(): Promise<DriverCandidate[]> {
  const { data, error } = await (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .limit(500);

  if (error) throw error;
  return (data ?? []) as DriverCandidate[];
}

export async function matchBestDriver(input: MatchDriverInput) {
  const drivers = await getAvailableDrivers();
  if (!drivers.length) return null;

  const ranked = drivers
    .map((driver) => ({
      driver,
      score: scoreDriver(driver, input.pickupLat, input.pickupLng, input.zone),
    }))
    .sort((a, b) => b.score - a.score);

  return ranked[0] ?? null;
}

export async function assignMatchedDriver(input: MatchDriverInput) {
  const matched = await matchBestDriver(input);
  if (!matched?.driver?.user_id) {
    console.warn(`[driver-matching] No driver found for order ${input.orderId}`);
    return null;
  }

  const etaMinutes = Math.max(8, Math.round(18 - Math.min(10, matched.score / 20)));

  const { data: order, error } = await (supabase as any)
    .from("orders")
    .update({
      driver_id: matched.driver.user_id,
      assigned_driver_user_id: matched.driver.user_id,
      status: "driver_assigned",
      updated_at: new Date().toISOString(),
      estimated_driver_arrival_min: etaMinutes,
    })
    .eq("id", input.orderId)
    .select("*")
    .single();

  if (error) throw error;

  const result = {
    orderId: input.orderId,
    driverId: matched.driver.user_id,
    etaMinutes,
    matchingScore: matched.score,
  };

  // 1. Event bus — driver assigned
  void eventBus.emit("order.driver.assigned", {
    orderId: input.orderId,
    driverId: matched.driver.user_id,
    etaMinutes,
  });

  // 2. Radar sync — new driver pin
  platformBus.emit(APP_EVENTS.RADAR_GEO_UPDATED, {
    orderId: input.orderId,
    driverId: matched.driver.user_id,
    lat: matched.driver.current_lat,
    lng: matched.driver.current_lng,
  }, "driver");

  // 3. Orbit context — notify conversation
  void eventBus.emit("orbit.delivery.context", {
    orderId: input.orderId,
    driverId: matched.driver.user_id,
    etaMinutes,
    status: "driver_assigned",
  });

  // 4. Dashboard + notification refresh
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId: input.orderId }, "driver");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, {
    userId: order?.customer_user_id,
  }, "driver");

  return result;
}
