/**
 * Order status bridge — update order status with full event propagation.
 * 
 * Every status change emits:
 * - order.status.updated (eventBus)
 * - dashboard counters refresh (platformBus)
 * - notifications refresh (platformBus)
 * - orbit context update (eventBus)
 * - notification dispatcher calls for key milestones
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";
import { eventBus } from "@/lib/core/event-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import {
  notifyOrderAccepted,
  notifyOrderReady,
  notifyOrderDelivered,
} from "@/lib/engines/notification-event-dispatcher";

export async function setOrderStatusWithEvents(params: {
  orderId: string;
  status: string;
  actorType?: "customer" | "merchant" | "driver" | "system";
  notes?: string;
}) {
  const patch: Record<string, any> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.status === "completed" || params.status === "delivered") {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as any)
    .from("orders")
    .update(patch)
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw error;

  const order = data;
  const customerId = order?.customer_user_id;

  // 1. Canonical event bus — order status changed
  void eventBus.emit("order.status.updated", {
    orderId: params.orderId,
    status: params.status,
    actorType: params.actorType ?? "system",
    previousStatus: order?.status,
  });

  // 2. Orbit context — update conversation if linked
  void eventBus.emit("orbit.order.context", {
    orderId: params.orderId,
    status: params.status,
    workspaceId: order?.workspace_id,
  });

  // 3. Platform bus — refresh UI
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { orderId: params.orderId }, "order");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId: customerId }, "order");
  platformBus.emit(APP_EVENTS.DASHBOARD_REFRESH, { orderId: params.orderId }, "order");

  // 4. Status-specific notifications (non-blocking)
  const shopName = order?.merchant_profile_id ?? "";
  if (customerId) {
    switch (params.status) {
      case "confirmed":
      case "preparing":
        notifyOrderAccepted(customerId, params.orderId, shopName).catch(console.error);
        break;
      case "ready_for_pickup":
        notifyOrderReady(customerId, params.orderId, shopName).catch(console.error);
        break;
      case "delivered":
      case "completed":
        notifyOrderDelivered(customerId, params.orderId, shopName).catch(console.error);
        break;
    }
  }

  return data;
}
