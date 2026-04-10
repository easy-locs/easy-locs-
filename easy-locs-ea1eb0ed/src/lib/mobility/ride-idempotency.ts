/**
 * ride-idempotency — Server-side dedup check against recent mobility_jobs.
 */
import { supabase } from "@/integrations/supabase/client";

export function buildRideIdempotencyKey(payload: any) {
  return [
    payload.customer_user_id ?? "anon",
    payload.pickup_lat,
    payload.pickup_lng,
    payload.dropoff_lat,
    payload.dropoff_lng,
    payload.pickup_label ?? "",
    payload.dropoff_label ?? "",
  ].join("|");
}

export async function findRecentDuplicateRide(idempotencyKey: string, ttlMs = 15000) {
  const since = new Date(Date.now() - ttlMs).toISOString();

  const { data } = await supabase
    .from("mobility_jobs")
    .select("id,status,created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(10);

  // Check metadata for idempotency key match (client-side filter since jsonb query varies)
  const match = (data ?? []).find(
    (j: any) => j.metadata?.idempotency_key === idempotencyKey,
  );

  return match ?? null;
}
