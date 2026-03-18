import { supabase } from "@/integrations/supabase/client";

export async function pushDriverLocation(params: {
  driverId: string;
  lat: number;
  lng: number;
  accuracyM?: number;
  heading?: number;
  speedKmh?: number;
  serviceMode?: "delivery" | "taxi" | "courier" | "mixed";
}) {
  const { data, error } = await (supabase as any)
    .from("driver_locations")
    .insert({
      driver_id: params.driverId,
      lat: params.lat,
      lng: params.lng,
      accuracy_m: params.accuracyM ?? null,
      heading: params.heading ?? null,
      speed_kmh: params.speedKmh ?? null,
      service_mode: params.serviceMode ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestDriverLocation(driverId: string) {
  const { data, error } = await (supabase as any)
    .from("driver_locations")
    .select("*")
    .eq("driver_id", driverId)
    .order("recorded_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function findNearbyDrivers(params: {
  serviceMode: "delivery" | "taxi" | "courier" | "mixed";
  limit?: number;
}) {
  const modes = params.serviceMode === "mixed"
    ? ["mixed", "delivery", "taxi", "courier"]
    : [params.serviceMode, "mixed"];

  const { data, error } = await (supabase as any)
    .from("driver_profiles")
    .select("*")
    .eq("is_online", true)
    .eq("is_available", true)
    .in("service_mode", modes)
    .order("last_seen_at", { ascending: false })
    .limit(params.limit ?? 30);

  if (error) throw error;
  return data ?? [];
}
