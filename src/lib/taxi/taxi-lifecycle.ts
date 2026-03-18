/**
 * Taxi lifecycle — start/complete ride with order status updates.
 */
import { supabase } from "@/integrations/supabase/client";
import { updateOrderStatus } from "@/lib/orders/orders-core";

export async function startTaxiRide(orderId: string) {
  // Update ride request status
  await (supabase as any)
    .from("taxi_ride_requests")
    .update({ status: "ongoing" })
    .eq("order_id", orderId);

  // Update order status
  return updateOrderStatus({
    orderId,
    status: "in_progress",
  });
}

export async function completeTaxiRide(orderId: string) {
  // Update ride request status
  await (supabase as any)
    .from("taxi_ride_requests")
    .update({ status: "completed" })
    .eq("order_id", orderId);

  // Update order status
  return updateOrderStatus({
    orderId,
    status: "completed",
  });
}

export async function cancelTaxiRide(orderId: string) {
  await (supabase as any)
    .from("taxi_ride_requests")
    .update({ status: "cancelled" })
    .eq("order_id", orderId);

  return updateOrderStatus({
    orderId,
    status: "cancelled",
  });
}

export async function matchTaxiDriver(params: {
  orderId: string;
  driverUserId: string;
}) {
  await (supabase as any)
    .from("taxi_ride_requests")
    .update({ status: "matched" })
    .eq("order_id", params.orderId);

  return updateOrderStatus({
    orderId: params.orderId,
    status: "assigned",
    assignedDriverUserId: params.driverUserId,
  });
}
