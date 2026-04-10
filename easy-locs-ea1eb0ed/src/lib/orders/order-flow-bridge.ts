/**
 * order-flow-bridge — Wraps order mutations with smart flow tracing + propagation.
 * Single responsibility: trace order lifecycle and detect broken propagation chains.
 */
import { startFlow, addStep, completeStep, failStep, endFlow } from "@/lib/runtime/flow-tracer";
import { trackPropagation } from "@/lib/runtime/propagation-validator";
import { reportHealth } from "@/lib/runtime/health-aggregator";
import { setOrderStatusWithEvents } from "./order-status-bridge";

/**
 * Smart order status update — wraps canonical bridge with flow tracing.
 */
export async function smartUpdateOrderStatus(params: {
  orderId: string;
  status: string;
  actorType?: "customer" | "merchant" | "driver" | "system";
  notes?: string;
}) {
  const flow = startFlow("orders", `status_${params.status}`);

  const dbStep = addStep(flow, "db_write");
  try {
    const result = await setOrderStatusWithEvents(params);
    completeStep(flow, dbStep, { orderId: params.orderId, status: params.status });

    trackPropagation({
      flowId: flow.flowId,
      domain: "orders",
      action: `status_${params.status}`,
      dbWriteSuccess: true,
      eventEmitted: "order.status.updated",
      cacheInvalidated: ["orders", "dashboard-counters"],
    });

    reportHealth("orders", "ok");
    endFlow(flow, "success");
    return result;
  } catch (err: any) {
    failStep(flow, dbStep, err?.message);
    reportHealth("orders", "degraded", undefined, err?.message);

    trackPropagation({
      flowId: flow.flowId,
      domain: "orders",
      action: `status_${params.status}`,
      dbWriteSuccess: false,
      eventEmitted: null,
      cacheInvalidated: [],
    });

    endFlow(flow, "failed");
    throw err;
  }
}
