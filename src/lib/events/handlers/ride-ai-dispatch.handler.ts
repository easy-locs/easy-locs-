/**
 * ride-ai-dispatch.handler — Listens for ride.requested, orchestrates AI dispatch with logging.
 */
import { eventBus } from "@/lib/core/event-bus";
import { orchestrateRideAI } from "@/lib/mobility/ride-ai-orchestrator";
import { logMobilityAI } from "@/lib/mobility/mobility-ai-logger";

export function initRideAIDispatchHandler() {
  eventBus.on("ride.requested", async (payload) => {
    try {
      const result = await orchestrateRideAI(payload);

      await logMobilityAI({
        jobId: (result.job as any)?.id ?? null,
        logType: "dispatch",
        message: result.reused ? "Reused duplicate ride request" : "Ride AI dispatched",
        metadata: {
          reused: result.reused,
          price: result.pricing?.finalPrice ?? null,
          surge: result.pricing?.surgeMultiplier ?? null,
          driversScored: result.scoredDrivers?.length ?? 0,
        },
      });

      void eventBus.emit("ride.ai.dispatched", {
        jobId: (result.job as any).id,
        price: result.pricing?.finalPrice ?? null,
        surge: result.pricing?.surgeMultiplier ?? null,
        driversScored: result.scoredDrivers.length,
        reused: result.reused,
      });
    } catch (error) {
      console.error("[ride-ai-dispatch] Failed:", error);

      await logMobilityAI({
        logType: "failure",
        logLevel: "error",
        message: "Ride AI dispatch failed",
        metadata: {
          reason: error instanceof Error ? error.message : "unknown_error",
        },
      });

      void eventBus.emit("ride.ai.failed", {
        reason: error instanceof Error ? error.message : "unknown_error",
      });
    }
  });
}
