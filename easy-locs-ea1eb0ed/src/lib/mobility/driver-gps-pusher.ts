import { db } from "@/services/db";

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

  await db("trip_live_state").upsert({
    job_id: jobId,
    rider_user_id: riderUserId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    updated_at: now,
  });

  await db("trip_location_points").insert({
    job_id: jobId,
    rider_user_id: riderUserId,
    lat: coords.latitude,
    lng: coords.longitude,
    heading: coords.heading ?? 0,
    speed: coords.speed ?? 0,
    recorded_at: now,
  });
}
