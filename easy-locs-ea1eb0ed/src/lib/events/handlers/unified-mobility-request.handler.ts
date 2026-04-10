/**
 * Unified Mobility Request Handler — single event handler for all mobility dispatch.
 */
import { eventBus } from "@/lib/core/event-bus";
import { orchestrateUnifiedMobility } from "@/lib/mobility/unified-mobility-orchestrator";

export function initUnifiedMobilityRequestHandler() {
  eventBus.on("mobility.requested", async (payload) => {
    try {
      const result = await orchestrateUnifiedMobility(payload as any);

      void eventBus.emit("mobility.dispatched", {
        jobId: (result.job as any).id,
        context: (result.job as any).job_type,
        price: result.pricing.finalPrice,
        surge: result.pricing.surgeMultiplier,
        driversScored: result.scoredDrivers.length,
      });

      // Backward-compatible taxi bridge
      if (payload.context === "taxi") {
        void eventBus.emit("ride.ai.dispatched", {
          jobId: (result.job as any).id,
          price: result.pricing.finalPrice,
          surge: result.pricing.surgeMultiplier,
          driversScored: result.scoredDrivers.length,
        });
      }
    } catch (error) {
      void eventBus.emit("mobility.dispatch.failed", {
        context: payload?.context ?? "unknown",
        reason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  });
}
