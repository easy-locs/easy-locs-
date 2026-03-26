/**
 * ride-ai-dispatch.handler — Listens for ride.requested, orchestrates AI dispatch.
 */
import { eventBus } from "@/lib/core/event-bus";
import { orchestrateRideAI } from "@/lib/mobility/ride-ai-orchestrator";

export function initRideAIDispatchHandler() {
  eventBus.on("ride.requested", async (payload) => {
    try {
      const result = await orchestrateRideAI(payload);

      void eventBus.emit("ride.ai.dispatched", {
        jobId: (result.job as any).id,
        price: result.pricing.finalPrice,
        surge: result.pricing.surgeMultiplier,
        driversScored: result.scoredDrivers.length,
      });
    } catch (error) {
      console.error("[ride-ai-dispatch] Failed:", error);
      void eventBus.emit("ride.ai.failed", {
        reason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  });
}
