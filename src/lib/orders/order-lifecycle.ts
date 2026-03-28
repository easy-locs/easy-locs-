/**
 * order-lifecycle — Atomic unit: manages order state transitions.
 * Single responsibility: validate + apply order status changes.
 */
import { supabase } from "@/integrations/supabase/client";
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { platformBus } from "@/lib/shared/platform-bus";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { APP_EVENTS } from "@/lib/platform/events";

const trace = (step: string, phase: "input" | "output" | "error", payload?: Record<string, unknown>) => {
  const logger = phase === "error" ? console.error : console.log;
  logger(`[ORDER][${step}] ${phase}:`, payload ?? {});
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["picked_up", "cancelled"],
  picked_up: ["delivering"],
  delivering: ["delivered", "failed"],
  delivered: ["completed"],
  failed: ["refunded"],
};

export interface TransitionInput {
  orderId: string;
  fromStatus: string;
  toStatus: string;
  actorId: string;
  reason?: string;
}

export interface TransitionResult {
  success: boolean;
  error?: string;
}

export function validateTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionOrder(input: TransitionInput): Promise<TransitionResult> {
  const flow = startFlow("orders", "transition");
  trace("transition", "input", { ...input });

  // Validate
  const validateStep = addStep(flow, "validate");
  if (!validateTransition(input.fromStatus, input.toStatus)) {
    const err = `Invalid transition: ${input.fromStatus} → ${input.toStatus}`;
    failStep(flow, validateStep, err);
    endFlow(flow, "failed");
    return { success: false, error: err };
  }
  completeStep(flow, validateStep);

  // Write
  const writeStep = addStep(flow, "db_write");
  try {
    const { error } = await (supabase as any)
      .from("orders")
      .update({
        status: input.toStatus,
        updated_at: new Date().toISOString(),
        updated_by: input.actorId,
      })
      .eq("id", input.orderId)
      .eq("status", input.fromStatus); // Optimistic lock

    if (error) {
      failStep(flow, writeStep, error.message);
      reportHealth("orders", "degraded", undefined, error.message);
      endFlow(flow, "failed");
      return { success: false, error: error.message };
    }

    completeStep(flow, writeStep);

    platformBus.emit("order:status_changed", {
      orderId: input.orderId, from: input.fromStatus, to: input.toStatus,
    }, "orders");
    platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, {}, "orders");

    trackPropagation({
      flowId: flow.flowId, domain: "orders", action: `transition_${input.toStatus}`,
      dbWriteSuccess: true, eventEmitted: "order:status_changed", cacheInvalidated: ["orders"],
    });

    reportHealth("orders", "ok", flow.totalLatencyMs);
    endFlow(flow, "success");
    trace("transition", "output", { success: true });
    return { success: true };
  } catch (err: any) {
    failStep(flow, writeStep, err.message);
    reportHealth("orders", "down", undefined, err.message);
    endFlow(flow, "failed");
    return { success: false, error: err.message };
  }
}
