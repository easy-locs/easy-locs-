import { supabase } from "@/integrations/supabase/client";
import { haversineKm } from "@/lib/geo/distance";

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
  if (!matched?.driver?.user_id) return null;

  const etaMinutes = Math.max(8, Math.round(18 - Math.min(10, matched.score / 20)));

  const { error } = await supabase
    .from("orders")
    .update({
      driver_id: matched.driver.user_id,
      status: "driver_assigned",
      updated_at: new Date().toISOString(),
      estimated_driver_arrival_min: etaMinutes,
    } as any)
    .eq("id", input.orderId);

  if (error) throw error;

  return {
    orderId: input.orderId,
    driverId: matched.driver.user_id,
    etaMinutes,
    matchingScore: matched.score,
  };
}
