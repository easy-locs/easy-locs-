/**
 * ride-postflow.handler — DEPRECATED: merged into close-flow-engine.ts
 * Both payment and rating are now handled by the unified close flow.
 */
import { eventBus } from "@/lib/core/event-bus";

export function initRidePostflowHandler() {
  // Handled by close-flow-engine — no duplicate emit
}
