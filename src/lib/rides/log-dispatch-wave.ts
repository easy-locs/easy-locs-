/**
 * log-dispatch-wave — Record AI dispatch wave details for analytics.
 */
import { supabase } from "@/integrations/supabase/client";

export async function logDispatchWave(params: {
  rideRequestId: string;
  waveIndex: number;
  drivers: Array<{ id: string; score?: number }>;
  dispatchReason?: string;
}) {
  const { rideRequestId, waveIndex, drivers, dispatchReason = "ai_dispatch" } = params;

  if (!drivers.length) return { ok: true, skipped: true };

  const rows = drivers.map((d) => ({
    ride_request_id: rideRequestId,
    driver_id: d.id,
    wave_index: waveIndex,
    score: d.score ?? 0,
    dispatch_reason: dispatchReason,
    response_status: "pending",
  }));

  const { error } = await supabase
    .from("ride_dispatch_logs" as any)
    .insert(rows as any);

  if (error) throw error;
  return { ok: true };
}
