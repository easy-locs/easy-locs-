import { supabase } from "@/integrations/supabase/client";
import { notifyOrderCreated } from "@/lib/engines/notification-event-dispatcher";
import { platformBus } from "@/lib/shared/platform-bus";
import { APP_EVENTS } from "@/lib/platform/events";
import { getCurrentUserId } from "@/families/identity";

/**
 * Idempotent order creation.
 * If a draft order already exists for same user+workspace+type, return it.
 */
export async function createOrder(params: {
  workspaceId?: string;
  merchantProfileId?: string;
  orderType?: "food_delivery" | "courier" | "taxi_ride" | "pickup";
  serviceMode?: "delivery" | "taxi" | "courier";
  pickupAddressId?: string;
  dropoffAddressId?: string;
  notes?: string;
  idempotencyKey?: string;
}) {
  const userId = await getCurrentUserId();

  // Idempotency: check for existing draft order with same key or same workspace+type
  if (params.idempotencyKey) {
    const { data: existing } = await (supabase as any)
      .from("orders")
      .select("*")
      .eq("customer_user_id", userId)
      .eq("idempotency_key", params.idempotencyKey)
      .maybeSingle();
    if (existing) return existing;
  }

  const { data, error } = await (supabase as any)
    .from("orders")
    .insert({
      workspace_id: params.workspaceId ?? null,
      customer_user_id: userId,
      merchant_profile_id: params.merchantProfileId ?? null,
      order_type: params.orderType ?? "food_delivery",
      service_mode: params.serviceMode ?? "delivery",
      status: "draft",
      pickup_address_id: params.pickupAddressId ?? null,
      dropoff_address_id: params.dropoffAddressId ?? null,
      notes: params.notes ?? null,
      idempotency_key: params.idempotencyKey ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;

  // Emit platform events
  platformBus.emit(APP_EVENTS.DASHBOARD_COUNTERS_REFRESH, { userId }, "order");
  platformBus.emit(APP_EVENTS.NOTIFICATIONS_REFRESH, { userId }, "order");

  // Fire notification (non-blocking)
  notifyOrderCreated(userId, data.id, params.merchantProfileId || "", 0).catch(console.error);

  return data;
}

export async function addOrderItem(params: {
  orderId: string;
  menuItemId?: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  notes?: string;
}) {
  const totalPrice = Number((params.unitPrice * params.quantity).toFixed(2));

  const { data, error } = await (supabase as any)
    .from("order_items")
    .insert({
      order_id: params.orderId,
      menu_item_id: params.menuItemId ?? null,
      item_name: params.itemName,
      unit_price: params.unitPrice,
      quantity: params.quantity,
      total_price: totalPrice,
      notes: params.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  await recalcOrderTotals(params.orderId);
  return data;
}

export async function recalcOrderTotals(orderId: string) {
  const { data: items } = await (supabase as any)
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  const subtotal = Number(
    (items ?? []).reduce((sum: number, row: any) => sum + Number(row.total_price), 0).toFixed(2)
  );

  const { data, error } = await (supabase as any)
    .from("orders")
    .update({ subtotal, total_amount: subtotal } as any)
    .eq("id", orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function updateOrderStatus(params: {
  orderId: string;
  status: string;
  assignedDriverUserId?: string | null;
}) {
  const patch: Record<string, any> = { status: params.status };

  if ("assignedDriverUserId" in params) {
    patch.assigned_driver_user_id = params.assignedDriverUserId ?? null;
  }

  if (params.status === "completed" || params.status === "delivered") {
    patch.completed_at = new Date().toISOString();
  }

  const { data, error } = await (supabase as any)
    .from("orders")
    .update(patch as any)
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
