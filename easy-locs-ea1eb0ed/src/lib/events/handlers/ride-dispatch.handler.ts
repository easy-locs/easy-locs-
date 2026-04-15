/**
 * ride-dispatch.handler — Legacy handler, now delegates to AI orchestrator.
 * Kept for backward compatibility; initRideAIDispatchHandler is the canonical handler.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { dispatchRide } from "@/lib/mobility/dispatch-engine";
import { db } from "@/services/db";
import { structuredLogger } from "@/lib/observability/structured-logger";

interface DispatchPayload {
  pickup_lat: number;
  pickup_lng: number;
  dropoff_lat: number;
  dropoff_lng: number;
  rider_id: string;
  vehicle_type?: string;
}

interface DispatchResult {
  pricing: { finalPrice: number; surge: number };
  drivers: Array<{ user_id: string }>;
}

export function initRideDispatchHandler() {
  platformBus.on("ride:dispatch_legacy", async (event) => {
    const payload = event.payload as DispatchPayload;
    const result: DispatchResult = await dispatchRide(payload);

    const { data: job } = await db("mobility_jobs")
      .insert({
        ...payload,
        status: "searching",
        current_price: result.pricing.finalPrice,
        surge_multiplier: result.pricing.surge,
      })
      .select()
      .single();

    if (!job) return;

    const jobRecord = job as Record<string, unknown>;

    for (const driver of result.drivers) {
      await db("mobility_job_offers").insert({
        job_id: jobRecord.id,
        rider_user_id: driver.user_id,
        status: "pending",
        eta_minutes: 5,
      });
    }

    structuredLogger.debug("rider", "legacy_dispatch", `Legacy dispatched ${jobRecord.id}`);
  });
}
