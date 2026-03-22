import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export async function listEligibleDrivers(city?: string | null) {
  let query = supabase
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true);

  if (city) query = query.eq("city", city);

  const { data, error } = await query.limit(100);
  if (error) throw error;
  return data ?? [];
}

export async function chooseBestDriver(params: {
  city?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
}) {
  const drivers = await listEligibleDrivers(params.city);
  if (!drivers.length) return null;

  const ranked = drivers
    .map((d: any) => {
      const hasGeo = d.current_lat != null && d.current_lng != null && params.pickupLat != null && params.pickupLng != null;
      const distance = hasGeo
        ? haversineKm(Number(d.current_lat), Number(d.current_lng), Number(params.pickupLat), Number(params.pickupLng))
        : 999;
      const reliability = Number(d.reliability_score ?? 70);
      const acceptance = Number(d.acceptance_rate ?? 70);
      const jobs = Number(d.jobs_completed ?? 0);
      const score =
        (distance < 999 ? Math.max(0, 100 - distance * 12) : 20) * 0.45 +
        reliability * 0.3 +
        acceptance * 0.15 +
        Math.min(jobs, 100) * 0.1;

      return { driver: d, distance, score };
    })
    .sort((a, b) => b.score - a.score);

  return ranked[0];
}

export async function assignBestDriverToOrder(params: {
  orderId: string;
  city?: string | null;
  pickupLat?: number | null;
  pickupLng?: number | null;
  zone?: string | null;
}) {
  const best = await chooseBestDriver(params);
  if (!best) return null;

  const { error } = await supabase
    .from("orders")
    .update({
      driver_id: best.driver.user_id ?? null,
      status: "driver_assigned",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", params.orderId);

  if (error) throw error;

  platformBus.emit(
    "MISSION_ACCEPTED",
    {
      orderId: params.orderId,
      driverId: best.driver.user_id,
      etaMinutes: Math.max(8, Math.round(best.distance * 4)),
      city: params.city ?? "Dubai",
      zone: params.zone ?? "",
    },
    "system"
  );

  return best;
}
