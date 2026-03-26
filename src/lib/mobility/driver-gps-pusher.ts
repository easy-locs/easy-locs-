import { supabase } from "@/integrations/supabase/client";

export async function pushDriverLocation(jobId: string, riderId: string, coords: any) {
  const now = new Date().toISOString();

  await supabase.from("trip_live_state").upsert({
    job_id: jobId,
    rider_user_id: riderId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    updated_at: now,
  });

  await supabase.from("trip_location_points").insert({
    job_id: jobId,
    rider_user_id: riderId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    recorded_at: now,
  });
}
