/**
 * delivery-event-bridge — Atomic unit: emit canonical delivery events.
 * Single responsibility: bridge delivery mutations to platform bus.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { trackPropagation } from "@/lib/runtime/propagation-validator";

export function emitDeliveryDispatched(payload: { jobId: string; driverId?: string; orderId?: string }) {
  platformBus.emit("delivery:dispatched" as any, payload, "delivery");
  reportHealth("delivery", "ok");

  trackPropagation({
    flowId: `delivery-dispatch-${payload.jobId}`,
    domain: "delivery",
    action: "dispatched",
    dbWriteSuccess: true,
    eventEmitted: "delivery:dispatched",
    cacheInvalidated: ["delivery-jobs", "active-deliveries"],
  });
}

export function emitDeliveryCompleted(payload: { jobId: string; orderId?: string }) {
  platformBus.emit("delivery:completed" as any, payload, "delivery");
  reportHealth("delivery", "ok");

  trackPropagation({
    flowId: `delivery-complete-${payload.jobId}`,
    domain: "delivery",
    action: "completed",
    dbWriteSuccess: true,
    eventEmitted: "delivery:completed",
    cacheInvalidated: ["delivery-jobs", "order-status"],
  });
}

export function emitDeliveryFailed(payload: { jobId: string; reason: string }) {
  platformBus.emit("delivery:failed" as any, payload, "delivery");
  reportHealth("delivery", "degraded", undefined, payload.reason);
}
