import { supabase } from "@/integrations/supabase/client";
import type { RideRow, RideEventRow, TrackingPositionRow } from "./types";

const db = supabase as any;

export async function insertRide(payload: Omit<RideRow, "id" | "created_at" | "updated_at">) {
  const { data, error } = await db.from("rides").insert(payload).select("*").single();
  if (error) throw new Error(error.message);
  return data as RideRow;
}

export async function updateRide(rideId: string, patch: Partial<RideRow>) {
  const { data, error } = await db.from("rides").update(patch).eq("id", rideId).select("*").single();
  if (error) throw new Error(error.message);
  return data as RideRow;
}

export async function getRide(rideId: string) {
  const { data, error } = await db.from("rides").select("*").eq("id", rideId).single();
  if (error) throw new Error(error.message);
  return data as RideRow;
}

export async function listMyRides(userId: string) {
  const { data, error } = await db
    .from("rides")
    .select("*")
    .or(`rider_user_id.eq.${userId},driver_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RideRow[];
}

export async function listOpenRidesForDrivers() {
  const { data, error } = await db
    .from("rides")
    .select("*")
    .in("status", ["searching", "scheduled"])
    .is("driver_user_id", null)
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as RideRow[];
}

export async function insertRideEvent(
  rideId: string,
  eventType: string,
  actorUserId: string | null,
  payload: Record<string, unknown> = {}
) {
  const { data, error } = await db
    .from("ride_events")
    .insert({ ride_id: rideId, event_type: eventType, actor_user_id: actorUserId, payload })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as RideEventRow;
}

export async function listRideEvents(rideId: string) {
  const { data, error } = await db
    .from("ride_events")
    .select("*")
    .eq("ride_id", rideId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as RideEventRow[];
}

export async function insertTrackingPosition(input: {
  rideId: string;
  userId: string;
  lat: number;
  lng: number;
  heading?: number | null;
  speedKmh?: number | null;
  accuracyM?: number | null;
}) {
  const { data, error } = await db
    .from("tracking_positions")
    .insert({
      ride_id: input.rideId,
      user_id: input.userId,
      lat: input.lat,
      lng: input.lng,
      heading: input.heading ?? null,
      speed_kmh: input.speedKmh ?? null,
      accuracy_m: input.accuracyM ?? null,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as TrackingPositionRow;
}

export async function getLatestTrackingPosition(rideId: string) {
  const { data, error } = await db
    .from("tracking_positions")
    .select("*")
    .eq("ride_id", rideId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data ?? null) as TrackingPositionRow | null;
}
