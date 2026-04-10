/**
 * ride-dispatch.handler — Legacy handler, now delegates to AI orchestrator.
 * Kept for backward compatibility; initRideAIDispatchHandler is the canonical handler.
 */
import { eventBus } from "@/lib/core/event-bus";
import { dispatchRide } from "@/lib/mobility/dispatch-engine";
import { supabase } from "@/integrations/supabase/client";

export function initRideDispatchHandler() {
  eventBus.on("ride.dispatch.legacy", async (payload: any) => {
    const result = await dispatchRide(payload);

    const { data: job } = await supabase
      .from("mobility_jobs")
      .insert({
        ...payload,
        status: "searching",
        current_price: result.pricing.finalPrice,
        surge_multiplier: result.pricing.surge,
      } as any)
      .select()
      .single();

    if (!job) return;

    for (const driver of result.drivers) {
      await supabase.from("mobility_job_offers").insert({
        job_id: (job as any).id,
        rider_user_id: driver.user_id,
        status: "pending",
        eta_minutes: 5,
      } as any);
    }

    if (import.meta.env.DEV) {
      console.log("[ride-dispatch] Legacy dispatched", (job as any).id);
    }
  });
}
