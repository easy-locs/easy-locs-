/**
 * Delivery domain orchestration handlers.
 * Single responsibility: mission lifecycle event → status update + notification + log.
 */
import { platformBus } from "@/lib/shared/platform-bus";
import { db } from "@/services/db";
import { logOrchestrationEvent } from "../logger";
import type { MissionAcceptedPayload, MissionCompletedPayload } from "../eventTypes";
import { createNotification, updateOrderStatus } from "../orchestration-utils";

interface MissionCreatedPayload {
  orderId: string;
  city?: string;
  pickupLat?: number;
  pickupLng?: number;
  zone?: string;
}

export function installDeliveryHandlers(): void {
  platformBus.on("MISSION_CREATED", async (event) => {
    const p = event.payload as MissionCreatedPayload;
    await logOrchestrationEvent({ eventType: "orch_mission_created", entityId: p.orderId, entityType: "delivery", metadata: p as Record<string, unknown> });
  });

  platformBus.on("MISSION_ACCEPTED", async (event) => {
    const p = event.payload as MissionAcceptedPayload;
    await updateOrderStatus(p.orderId, "driver_assigned");
    await db("orders").update({ driver_id: p.driverId, updated_at: new Date().toISOString() }).eq("id", p.orderId);
    await createNotification({ actorType: "user", templateKey: "driver_assigned", payload: p as Record<string, unknown> });
    await logOrchestrationEvent({ eventType: "orch_mission_accepted", entityId: p.orderId, entityType: "delivery", metadata: p as Record<string, unknown> });
  });

  platformBus.on("mission:accepted", async (event) => {
    const p = event.payload as MissionAcceptedPayload;
    if (!p?.orderId) return;
    await updateOrderStatus(p.orderId, "driver_assigned");
    await db("orders").update({ driver_id: p.driverId, updated_at: new Date().toISOString() }).eq("id", p.orderId);
    await createNotification({ actorType: "user", templateKey: "driver_assigned", payload: p as Record<string, unknown> });
    await logOrchestrationEvent({ eventType: "orch_mission_accepted", entityId: p.orderId, entityType: "delivery", metadata: p as Record<string, unknown> });
  });

  platformBus.on("MISSION_COMPLETED", async (event) => {
    const p = event.payload as MissionCompletedPayload;
    await updateOrderStatus(p.orderId, "delivered");
    platformBus.emit("ORDER_DELIVERED", { orderId: p.orderId }, "system");
    await logOrchestrationEvent({ eventType: "orch_mission_completed", entityId: p.orderId, entityType: "delivery", metadata: p as Record<string, unknown> });
  });

  platformBus.on("mission:completed", async (event) => {
    const p = event.payload as MissionCompletedPayload;
    if (!p?.orderId) return;
    await updateOrderStatus(p.orderId, "delivered");
    platformBus.emit("ORDER_DELIVERED", { orderId: p.orderId }, "system");
    await logOrchestrationEvent({ eventType: "orch_mission_completed", entityId: p.orderId, entityType: "delivery", metadata: p as Record<string, unknown> });
  });
}
