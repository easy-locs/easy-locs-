/**
 * Unified Mobility Request Handler — single event handler for all mobility dispatch.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { orchestrateUnifiedMobility } from "@/lib/mobility/unified-mobility-orchestrator";

export function initUnifiedMobilityRequestHandler() {
  platformBus.on("mobility:requested", async (event) => {
    const payload = event.payload as Record<string, any>;
    try {
      const result = await orchestrateUnifiedMobility(payload as any);

      platformBus.emit("mobility:dispatched", {
        jobId: (result.job as any).id,
        context: (result.job as any).job_type,
        price: result.pricing.finalPrice,
        surge: result.pricing.surgeMultiplier,
        driversScored: result.scoredDrivers.length,
      }, "tracking");

      if (payload.context === "taxi") {
        platformBus.emit("ride:ai_dispatched", {
          jobId: (result.job as any).id,
          price: result.pricing.finalPrice,
          surge: result.pricing.surgeMultiplier,
          driversScored: result.scoredDrivers.length,
        }, "tracking");
      }
    } catch (error) {
      platformBus.emit("mobility:dispatch_failed", {
        context: payload?.context ?? "unknown",
        reason: error instanceof Error ? error.message : "unknown_error",
      }, "system");
    }
  });
}
