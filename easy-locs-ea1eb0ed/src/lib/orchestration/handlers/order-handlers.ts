/**
 * Order domain orchestration handlers.
 * Single responsibility: order lifecycle event → status update + notification + log.
 *
 * V4: All listeners use canonical colon-notation events from platformBus.
 * Legacy UPPERCASE events (PAYMENT_SUCCESS, ORDER_CREATED) are NO LONGER used —
 * the wallet emits wallet:payment_success and the booking store emits booking:*.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { logOrchestrationEvent } from "../logger";
import type {
  OrderConfirmedPayload,
  OrderReadyPayload,
  OrderDeliveredPayload,
} from "../eventTypes";
import { createNotification, updateOrderStatus } from "../orchestration-utils";

function resolveOrderId(payload: Record<string, unknown>): string | null {
  if (payload.orderId && typeof payload.orderId === "string") return payload.orderId;
  if (payload.referenceId && payload.referenceType === "order") return payload.referenceId as string;
  if (typeof payload.reference === "string") {
    if (payload.reference.startsWith("order:")) return payload.reference.slice(6);
    if (/^[0-9a-f-]{36}$/i.test(payload.reference)) return payload.reference;
  }
  return null;
}

export function installOrderHandlers(): void {
  platformBus.on("storefront:order_placed", async (event) => {
    const p = event.payload as Record<string, unknown>;
    if (p?.merchantId) {
      await createNotification({ actorType: "pro", actorId: p.merchantId as string, templateKey: "merchant_new_order", payload: p });
    }
    await logOrchestrationEvent({ eventType: "orch_order_created", entityId: (p?.orderId ?? "") as string, entityType: "order", metadata: p });
  });

  platformBus.on("booking:requested", async (event) => {
    const p = event.payload as Record<string, unknown>;
    await logOrchestrationEvent({ eventType: "orch_booking_requested", entityId: (p?.booking as Record<string, unknown>)?.id as string ?? "", entityType: "order", metadata: p });
  });

  platformBus.on("wallet:payment_success", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const orderId = resolveOrderId(p);
    if (orderId) {
      await updateOrderStatus(orderId, "paid");
      if (p.merchantWalletId) {
        await createNotification({ actorType: "pro", actorId: p.merchantWalletId as string, templateKey: "payment_received_pending_fulfillment", payload: p });
      }
    }
    await logOrchestrationEvent({ eventType: "orch_payment_success", entityId: orderId ?? (p.transactionId as string) ?? "", entityType: "order", metadata: p, newValue: p.amount as number });
  });

  platformBus.on("wallet:payment_completed", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const orderId = resolveOrderId(p);
    if (orderId && p?.stage === "captured") {
      await updateOrderStatus(orderId, "paid");
      await logOrchestrationEvent({ eventType: "orch_payment_captured", entityId: orderId, entityType: "order", metadata: p });
    }
  });

  platformBus.on("ORDER_CONFIRMED", async (event) => {
    const p = event.payload as OrderConfirmedPayload;
    await updateOrderStatus(p.orderId, "confirmed");
    await createNotification({ actorType: "user", templateKey: "order_confirmed", payload: p as Record<string, unknown> });
    await logOrchestrationEvent({ eventType: "orch_order_confirmed", entityId: p.orderId, entityType: "order", metadata: p as Record<string, unknown> });
  });

  platformBus.on("booking:confirmed", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const bookingId = (p?.bookingId ?? "") as string;
    if (bookingId) {
      await updateOrderStatus(bookingId, "confirmed");
      await logOrchestrationEvent({ eventType: "orch_booking_confirmed", entityId: bookingId, entityType: "order", metadata: p });
    }
  });

  platformBus.on("ORDER_READY", async (event) => {
    const p = event.payload as OrderReadyPayload;
    await updateOrderStatus(p.orderId, "driver_search");
    platformBus.emit("MISSION_CREATED", { orderId: p.orderId, city: p.city ?? "Dubai", pickupLat: p.pickupLat ?? 0, pickupLng: p.pickupLng ?? 0, zone: p.zone ?? "" }, "system");
    await logOrchestrationEvent({ eventType: "orch_order_ready", entityId: p.orderId, entityType: "order", metadata: p as Record<string, unknown> });
  });

  platformBus.on("ORDER_DELIVERED", async (event) => {
    const p = event.payload as OrderDeliveredPayload;
    await updateOrderStatus(p.orderId, "completed");
    await createNotification({ actorType: "user", templateKey: "order_completed", payload: p as Record<string, unknown> });
    await logOrchestrationEvent({ eventType: "orch_order_delivered", entityId: p.orderId, entityType: "order", metadata: p as Record<string, unknown> });
  });

  platformBus.on("booking:completed", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const bookingId = (p?.bookingId ?? "") as string;
    if (bookingId) {
      await updateOrderStatus(bookingId, "completed");
      await createNotification({ actorType: "user", templateKey: "order_completed", payload: p });
      await logOrchestrationEvent({ eventType: "orch_booking_completed", entityId: bookingId, entityType: "order", metadata: p });
    }
  });

  platformBus.on("booking:cancelled", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const bookingId = (p?.bookingId ?? "") as string;
    if (bookingId) {
      await updateOrderStatus(bookingId, "cancelled");
      await logOrchestrationEvent({ eventType: "orch_booking_cancelled", entityId: bookingId, entityType: "order", metadata: p });
    }
  });

  platformBus.on("storefront:order_paid", async (event) => {
    const p = event.payload as Record<string, unknown>;
    const orderId = (p?.orderId ?? "") as string;
    if (orderId) {
      await updateOrderStatus(orderId, "paid");
      await logOrchestrationEvent({ eventType: "orch_order_paid", entityId: orderId, entityType: "order", metadata: p });
    }
  });
}
