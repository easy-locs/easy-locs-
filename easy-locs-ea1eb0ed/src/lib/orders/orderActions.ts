/**
 * Order Actions — Status transitions with orchestration bus integration.
 */

import { db } from "@/services/db";
import { canTransition, type OrderStatus } from "./order-status";
import { platformBus } from "@/lib/shared/platform-bus";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
export async function setOrderStatus(params: {
  orderId: string;
  currentStatus: OrderStatus;
  nextStatus: OrderStatus;
  merchantId?: string;
  city?: string;
  pickupLat?: number | null;
  pickupLng?: number | null;
  zone?: string | null;
}) {
  if (!canTransition(params.currentStatus, params.nextStatus)) {
    throw new Error(`Invalid status transition: ${params.currentStatus} → ${params.nextStatus}`);
  }

  const { error } = await cFrom("orders")
    .update({
      status: params.nextStatus,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId);

  if (error) throw error;

  if (params.nextStatus === "confirmed") {
    platformBus.emit("ORDER_CONFIRMED", {
      orderId: params.orderId,
      merchantId: params.merchantId ?? "",
    }, "system");
  }

  if (params.nextStatus === "ready_for_pickup") {
    platformBus.emit("ORDER_READY", {
      orderId: params.orderId,
      merchantId: params.merchantId ?? "",
      city: params.city ?? "Dubai",
      pickupLat: params.pickupLat ?? 0,
      pickupLng: params.pickupLng ?? 0,
      zone: params.zone ?? "",
    }, "system");
  }
}
