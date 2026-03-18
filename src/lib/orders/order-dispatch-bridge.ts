import { supabase } from "@/integrations/supabase/client";
import { createDispatchJob } from "@/lib/dispatch/dispatch-v1";
import { updateOrderStatus } from "@/lib/orders/orders-core";

export async function createDispatchFromOrder(orderId: string) {
  const { data: order, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (error) throw error;

  // Fetch addresses separately
  let pickupLabel = "Pickup";
  let dropoffLabel = "Dropoff";

  if (order.pickup_address_id) {
    const { data: pickup } = await (supabase as any)
      .from("saved_addresses")
      .select("*")
      .eq("id", order.pickup_address_id)
      .maybeSingle();
    if (pickup) pickupLabel = pickup.full_address || pickup.area || "Pickup";
  }

  if (order.dropoff_address_id) {
    const { data: dropoff } = await (supabase as any)
      .from("saved_addresses")
      .select("*")
      .eq("id", order.dropoff_address_id)
      .maybeSingle();
    if (dropoff) dropoffLabel = dropoff.full_address || dropoff.area || "Dropoff";
  }

  const dispatchJob = await createDispatchJob({
    workspaceId: order.workspace_id ?? undefined,
    orderId: order.id,
    sellerId: order.merchant_profile_id ?? undefined,
    buyerId: order.customer_user_id,
    pickupLabel,
    dropoffLabel,
    quotedFee: order.delivery_fee ?? 0,
    currency: order.currency ?? "AED",
  });

  await updateOrderStatus({ orderId: order.id, status: "ready_for_dispatch" });
  return dispatchJob;
}
