/**
 * Orchestration Engine — Connects all platform engines via the event bus.
 */

import { platformBus } from "@/lib/shared/platform-bus";
import { logOrchestrationEvent } from "./logger";
import type {
  IssueCreatedPayload,
  MissionAcceptedPayload,
  MissionCompletedPayload,
  OrderConfirmedPayload,
  OrderCreatedPayload,
  OrderDeliveredPayload,
  OrderReadyPayload,
  PaymentSuccessPayload,
  RefundRequestedPayload,
  UserOpenHomePayload,
  UserSearchPayload,
} from "./eventTypes";

import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

let installed = false;

async function createNotification(params: {
  actorType: "user" | "pro" | "driver" | "system";
  actorId?: string;
  channel?: "push" | "email" | "sms";
  templateKey: string;
  payload?: Record<string, unknown>;
}) {
  const { error } = await (supabase as any).from("notifications").insert({
    user_id: params.actorId ?? null,
    type: params.channel ?? "push",
    title: params.templateKey,
    message: JSON.stringify(params.payload ?? {}),
    priority: "normal",
  });

  if (error) {
    console.error("[orchestration] notification error", error);
  }
}

async function updateOrderStatus(orderId: string, status: string) {
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId);

  if (error) {
    console.error("[orchestration] updateOrderStatus error", error);
  }
}

async function createSupportTicket(payload: RefundRequestedPayload | IssueCreatedPayload) {
  const orderId = payload.orderId;
  const requesterUserId = payload.requesterUserId;

  const { error } = await supabase.from("support_tickets").insert({
    requester_user_id: requesterUserId,
    ticket_type: "reason" in payload ? "refund_issue" : (payload as IssueCreatedPayload).type,
    subject: orderId
      ? `Issue linked to order ${orderId}`
      : "General support issue",
    context_id: orderId ?? null,
    context_type: orderId ? "order" : "general",
    status: "open",
  });

  if (error) {
    console.error("[orchestration] support ticket error", error);
  }
}

export function installOrchestrationEngine() {
  if (installed) return;
  installed = true;

  // ── ORDER_CREATED ──
  platformBus.on("ORDER_CREATED", async (event) => {
    const payload = event.payload as OrderCreatedPayload;
    await createNotification({
      actorType: "pro",
      actorId: payload.merchantId,
      templateKey: "merchant_new_order",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_order_created",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── PAYMENT_SUCCESS ──
  platformBus.on("PAYMENT_SUCCESS", async (event) => {
    const payload = event.payload as PaymentSuccessPayload;
    await updateOrderStatus(payload.orderId, "paid");

    await createNotification({
      actorType: "pro",
      actorId: payload.merchantWalletId,
      templateKey: "payment_received_pending_fulfillment",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_payment_success",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
      newValue: payload.amount,
    });
  });

  // ── ORDER_CONFIRMED ──
  platformBus.on("ORDER_CONFIRMED", async (event) => {
    const payload = event.payload as OrderConfirmedPayload;
    await updateOrderStatus(payload.orderId, "confirmed");

    await createNotification({
      actorType: "user",
      templateKey: "order_confirmed",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_order_confirmed",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── ORDER_READY ──
  platformBus.on("ORDER_READY", async (event) => {
    const payload = event.payload as OrderReadyPayload;
    await updateOrderStatus(payload.orderId, "driver_search");

    platformBus.emit(
      "MISSION_CREATED",
      {
        orderId: payload.orderId,
        city: payload.city ?? "Dubai",
        pickupLat: payload.pickupLat ?? 0,
        pickupLng: payload.pickupLng ?? 0,
        zone: payload.zone ?? "",
      },
      "system"
    );

    await logOrchestrationEvent({
      eventType: "orch_order_ready",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── MISSION_CREATED ──
  platformBus.on("MISSION_CREATED", async (event) => {
    const payload = event.payload as any;
    await logOrchestrationEvent({
      eventType: "orch_mission_created",
      entityId: payload.orderId,
      entityType: "delivery",
      metadata: payload,
    });
  });

  // ── MISSION_ACCEPTED ──
  platformBus.on("MISSION_ACCEPTED", async (event) => {
    const payload = event.payload as MissionAcceptedPayload;
    await updateOrderStatus(payload.orderId, "driver_assigned");

    await supabase
      .from("orders")
      .update({ driver_id: payload.driverId, updated_at: new Date().toISOString() })
      .eq("id", payload.orderId);

    await createNotification({
      actorType: "user",
      templateKey: "driver_assigned",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_mission_accepted",
      entityId: payload.orderId,
      entityType: "delivery",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── MISSION_COMPLETED ──
  platformBus.on("MISSION_COMPLETED", async (event) => {
    const payload = event.payload as MissionCompletedPayload;
    await updateOrderStatus(payload.orderId, "delivered");

    platformBus.emit(
      "ORDER_DELIVERED",
      { orderId: payload.orderId },
      "system"
    );

    await logOrchestrationEvent({
      eventType: "orch_mission_completed",
      entityId: payload.orderId,
      entityType: "delivery",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── ORDER_DELIVERED ──
  platformBus.on("ORDER_DELIVERED", async (event) => {
    const payload = event.payload as OrderDeliveredPayload;
    await updateOrderStatus(payload.orderId, "completed");

    await createNotification({
      actorType: "user",
      templateKey: "order_completed",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_order_delivered",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── REFUND_REQUESTED ──
  platformBus.on("REFUND_REQUESTED", async (event) => {
    const payload = event.payload as RefundRequestedPayload;
    await createSupportTicket(payload);
    await updateOrderStatus(payload.orderId, "disputed");

    await createNotification({
      actorType: "system",
      templateKey: "refund_requested_admin_review",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_refund_requested",
      entityId: payload.orderId,
      entityType: "order",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── ISSUE_CREATED ──
  platformBus.on("ISSUE_CREATED", async (event) => {
    const payload = event.payload as IssueCreatedPayload;
    await createSupportTicket(payload);

    await createNotification({
      actorType: "system",
      templateKey: "issue_created",
      payload: payload as unknown as Record<string, unknown>,
    });

    await logOrchestrationEvent({
      eventType: "orch_issue_created",
      entityId: payload.ticketId,
      entityType: "support_ticket",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── USER_OPEN_HOME ──
  platformBus.on("USER_OPEN_HOME", async (event) => {
    const payload = event.payload as UserOpenHomePayload;
    await logOrchestrationEvent({
      eventType: "orch_user_open_home",
      entityId: payload.userId ?? "anonymous",
      entityType: "user_session",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  // ── USER_SEARCH ──
  platformBus.on("USER_SEARCH", async (event) => {
    const payload = event.payload as UserSearchPayload;
    await logOrchestrationEvent({
      eventType: "orch_user_search",
      entityId: payload.userId ?? "anonymous",
      entityType: "search",
      metadata: payload as unknown as Record<string, unknown>,
    });
  });

  console.log("[orchestration] Engine installed with", platformBus.getRegisteredEvents().length, "event handlers");
}
