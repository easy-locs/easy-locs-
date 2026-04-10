import { supabase } from "@/integrations/supabase/client";

export interface DriverCoordsInput {
  latitude: number;
  longitude: number;
  heading?: number | null;
  speed?: number | null;
}

export async function pushDriverLocation(
  jobId: string,
  riderUserId: string,
  coords: DriverCoordsInput,
) {
  const now = new Date().toISOString();

  await supabase.from("trip_live_state").upsert({
    job_id: jobId,
    rider_user_id: riderUserId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    updated_at: now,
  } as any);

  await supabase.from("trip_location_points").insert({
    job_id: jobId,
    rider_user_id: riderUserId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    recorded_at: now,
  } as any);
}
