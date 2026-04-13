/**
 * ride-tracking.repository — DB operations for TrackRidePage.
 */
import { db } from "@/services/db";
import { createRealtimeChannel, removeRealtimeChannel } from "@/lib/realtime";

export async function fetchMobilityJob(jobId: string) {
  const { data } = await db("mobility_jobs").select("*").eq("id", jobId).single();
  return data as any;
}

export function subscribeToJob(jobId: string, onUpdate: (payload: any) => void) {
  const ch = db
    .channel(`track-job-${jobId}`)
    .on("postgres_changes", {
      event: "UPDATE", schema: "public", table: "mobility_jobs", filter: `id=eq.${jobId}`,
    }, (payload) => onUpdate(payload.new))
    .subscribe();
  return { channel: ch, unsubscribe: () => removeRealtimeChannel(ch) };
}

export async function fetchRiderProfile(riderId: string) {
  const { data } = await db("rider_profiles")
    .select("id,display_name,vehicle_type,vehicle_plate,vehicle_model,rating,photo_url,phone")
    .eq("user_id", riderId).maybeSingle();
  return data as any;
}

export async function fetchRideConversation() {
  const { data } = await db("conversations_v2").select("id")
    .eq("type", "ride").limit(1).maybeSingle();
  return data?.id ?? null;
}

export async function cancelRide(jobId: string) {
  const { error } = await db("mobility_jobs").update({ status: "cancelled" }).eq("id", jobId);
  if (error) throw error;
}
