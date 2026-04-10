/**
 * Order domain orchestration handlers.
 * Single responsibility: order lifecycle event → status update + notification + log.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { supabase } from "@/integrations/supabase/client";
import { logOrchestrationEvent } from "../logger";
import type {
  OrderCreatedPayload,
  OrderConfirmedPayload,
  OrderReadyPayload,
  OrderDeliveredPayload,
  PaymentSuccessPayload,
} from "../eventTypes";
import { createNotification, updateOrderStatus } from "../orchestration-utils";

export function installOrderHandlers(): void {
  platformBus.on("ORDER_CREATED", async (event) => {
    const p = event.payload as OrderCreatedPayload;
    await createNotification({ actorType: "pro", actorId: p.merchantId, templateKey: "merchant_new_order", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_order_created", entityId: p.orderId, entityType: "order", metadata: p as any });
  });

  platformBus.on("PAYMENT_SUCCESS", async (event) => {
    const p = event.payload as PaymentSuccessPayload;
    await updateOrderStatus(p.orderId, "paid");
    await createNotification({ actorType: "pro", actorId: p.merchantWalletId, templateKey: "payment_received_pending_fulfillment", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_payment_success", entityId: p.orderId, entityType: "order", metadata: p as any, newValue: p.amount });
  });

  platformBus.on("ORDER_CONFIRMED", async (event) => {
    const p = event.payload as OrderConfirmedPayload;
    await updateOrderStatus(p.orderId, "confirmed");
    await createNotification({ actorType: "user", templateKey: "order_confirmed", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_order_confirmed", entityId: p.orderId, entityType: "order", metadata: p as any });
  });

  platformBus.on("ORDER_READY", async (event) => {
    const p = event.payload as OrderReadyPayload;
    await updateOrderStatus(p.orderId, "driver_search");
    platformBus.emit("MISSION_CREATED", { orderId: p.orderId, city: p.city ?? "Dubai", pickupLat: p.pickupLat ?? 0, pickupLng: p.pickupLng ?? 0, zone: p.zone ?? "" }, "system");
    await logOrchestrationEvent({ eventType: "orch_order_ready", entityId: p.orderId, entityType: "order", metadata: p as any });
  });

  platformBus.on("ORDER_DELIVERED", async (event) => {
    const p = event.payload as OrderDeliveredPayload;
    await updateOrderStatus(p.orderId, "completed");
    await createNotification({ actorType: "user", templateKey: "order_completed", payload: p as any });
    await logOrchestrationEvent({ eventType: "orch_order_delivered", entityId: p.orderId, entityType: "order", metadata: p as any });
  });
}
