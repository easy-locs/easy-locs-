import { supabase } from "@/integrations/supabase/client";
import { assignMatchedDriver } from "./driverMatchingEngine";
import { releaseOrderEscrow } from "./orderEscrowEngine";
import { setOrderStatusWithEvents } from "@/lib/orders/order-status-bridge";

export const ORDER_STATE_FLOW = [
  "draft",
  "pending_payment",
  "paid",
  "confirmed",
  "preparing",
  "ready_for_pickup",
  "driver_search",
  "driver_assigned",
  "picked_up",
  "on_the_way",
  "delivered",
  "completed",
] as const;

export async function moveOrderToNextState(orderId: string) {
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  if (!order) throw new Error("Order not found");

  const current = String((order as any).status ?? "draft");
  const idx = ORDER_STATE_FLOW.indexOf(current as any);
  if (idx < 0 || idx >= ORDER_STATE_FLOW.length - 1) {
    return { order, nextStatus: current, done: true };
  }

  let nextStatus = ORDER_STATE_FLOW[idx + 1];

  if (current === "ready_for_pickup") {
    nextStatus = "driver_search";
  }

  // Use the bridge for full event propagation
  await setOrderStatusWithEvents({
    orderId,
    status: nextStatus,
    actorType: "system",
  });

  if (nextStatus === "driver_search") {
    await assignMatchedDriver({
      orderId,
      pickupLat: (order as any).pickup_lat ?? null,
      pickupLng: (order as any).pickup_lng ?? null,
      zone: (order as any).pickup_zone ?? null,
    });
  }

  if (nextStatus === "completed") {
    await releaseOrderEscrow({
      orderId,
      merchantUserId: (order as any).merchant_user_id ?? null,
      driverUserId: (order as any).assigned_driver_user_id ?? null,
      amount: Number((order as any).total_amount ?? 0),
      currency: (order as any).currency ?? "AED",
    });
  }

  return { orderId, previousStatus: current, nextStatus, done: false };
}

export async function setSpecificOrderState(orderId: string, nextStatus: string) {
  // Use the bridge for full event propagation
  await setOrderStatusWithEvents({
    orderId,
    status: nextStatus,
    actorType: "system",
  });
  return { orderId, nextStatus };
}
