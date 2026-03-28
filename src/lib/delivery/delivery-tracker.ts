/**
 * delivery-tracker — Atomic unit: track delivery status and driver position.
 * Single responsibility: read delivery state from DB.
 */
import { supabase } from "@/integrations/supabase/client";
import { reportHealth } from "@/lib/runtime/health-aggregator";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[DELIVERY][${step}] ${phase}:`, payload ?? {});
};

export interface DeliveryState {
  jobId: string;
  status: string;
  driverUserId: string | null;
  driverLat: number | null;
  driverLng: number | null;
  etaMinutes: number | null;
  pickupAt: string | null;
  deliveredAt: string | null;
}

export async function getDeliveryState(jobId: string): Promise<DeliveryState | null> {
  trace("state.get", "input", { jobId });
  const start = Date.now();

  const { data, error } = await (supabase as any)
    .from("mobility_jobs")
    .select("id, status, driver_user_id, pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, picked_up_at, delivered_at, eta_minutes")
    .eq("id", jobId)
    .maybeSingle();

  const latency = Date.now() - start;
  if (error || !data) {
    trace("state.get", "error", { message: error?.message ?? "not_found", latency });
    reportHealth("delivery", "degraded", latency, error?.message);
    return null;
  }

  // Get driver position if assigned
  let driverLat: number | null = null;
  let driverLng: number | null = null;

  if (data.driver_user_id) {
    const { data: presence } = await (supabase as any)
      .from("rider_presence")
      .select("latitude, longitude")
      .eq("user_id", data.driver_user_id)
      .maybeSingle();

    if (presence) {
      driverLat = presence.latitude;
      driverLng = presence.longitude;
    }
  }

  const state: DeliveryState = {
    jobId: data.id,
    status: data.status,
    driverUserId: data.driver_user_id,
    driverLat, driverLng,
    etaMinutes: data.eta_minutes,
    pickupAt: data.picked_up_at,
    deliveredAt: data.delivered_at,
  };

  trace("state.get", "output", { status: state.status, hasDriver: !!state.driverUserId, latency });
  reportHealth("delivery", "ok", latency);
  return state;
}
