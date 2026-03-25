/**
 * orderEngine — Authoritative order creation and status management.
 * Uses storefront_orders + storefront_order_items as the single source of truth.
 */
import { supabase } from "@/integrations/supabase/client";
import type { CartItem } from "@/stores/cartStore";
import { notifyOrderCreated, notifyOrderDelivered } from "@/lib/engines/notification-event-dispatcher";

export type FulfillmentType = "delivery" | "pickup" | "dine_in";

export interface CreateOrderInput {
  shopId: string;
  sellerId: string;
  items: CartItem[];
  fulfillmentType: FulfillmentType;
  currency?: string;
  deliveryAddress?: string;
  deliveryLat?: number;
  deliveryLng?: number;
  deliveryFee?: number;
  notes?: string;
  paymentMethod?: string;
  tableCode?: string;
  idempotencyKey?: string;
}

export async function createStorefrontOrder(input: CreateOrderInput) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Idempotency: check if order with same key exists
  if (input.idempotencyKey) {
    const { data: existing } = await (supabase as any)
      .from("storefront_orders")
      .select("id")
      .eq("notes", `idem:${input.idempotencyKey}`)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (existing) return { order: existing, alreadyExists: true };
  }

  const subtotal = Number(
    input.items.reduce((sum, i) => sum + i.unitPrice * i.quantity, 0).toFixed(2)
  );
  const deliveryFee = input.deliveryFee ?? 0;
  const total = Number((subtotal + deliveryFee).toFixed(2));
  const currency = input.currency ?? "AED";

  const orderPayload: Record<string, any> = {
    shop_id: input.shopId,
    seller_id: input.sellerId,
    buyer_id: user.id,
    buyer_email: user.email ?? null,
    status: "pending",
    payment_status: "pending",
    payment_method: input.paymentMethod ?? null,
    subtotal,
    delivery_fee: deliveryFee,
    shipping_fee: deliveryFee,
    total,
    currency,
    notes: input.idempotencyKey ? `idem:${input.idempotencyKey}` : (input.notes ?? null),
    delivery_address: input.deliveryAddress ?? null,
    delivery_lat: input.deliveryLat ?? null,
    delivery_lng: input.deliveryLng ?? null,
    requires_delivery: input.fulfillmentType === "delivery",
  };

  const { data: order, error: orderErr } = await (supabase as any)
    .from("storefront_orders")
    .insert(orderPayload)
    .select("*")
    .single();

  if (orderErr) throw orderErr;

  // Insert order items with title snapshots
  const itemRows = input.items.map((item) => ({
    order_id: order.id,
    item_id: item.menuItemId || null,
    title: item.name,
    unit_price: item.unitPrice,
    quantity: item.quantity,
    total_price: Number((item.unitPrice * item.quantity).toFixed(2)),
  }));

  const { error: itemsErr } = await (supabase as any)
    .from("storefront_order_items")
    .insert(itemRows);

  if (itemsErr) throw itemsErr;

  // Insert initial status history
  await (supabase as any)
    .from("order_status_history")
    .insert({
      order_id: order.id,
      status: "pending",
      actor_type: "customer",
      actor_id: user.id,
    });

  // Notify customer
  notifyOrderCreated(user.id, order.id, input.shopId, total).catch(console.error);

  return { order, alreadyExists: false };
}

export async function updateStorefrontOrderStatus(params: {
  orderId: string;
  status: string;
  actorType?: string;
  notes?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();

  const patch: Record<string, any> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.status === "completed" || params.status === "delivered") {
    patch.payment_status = "paid";
  }

  const { data, error } = await (supabase as any)
    .from("storefront_orders")
    .update(patch)
    .eq("id", params.orderId)
    .select("*")
    .single();

  if (error) throw error;

  // Notify on delivery
  if (params.status === "delivered" && data?.buyer_id) {
    notifyOrderDelivered(data.buyer_id, params.orderId, data.shop_id || "").catch(console.error);
  }

  // Log status change
  await (supabase as any)
    .from("order_status_history")
    .insert({
      order_id: params.orderId,
      status: params.status,
      actor_type: params.actorType ?? "system",
      actor_id: user?.id ?? null,
      notes: params.notes ?? null,
    });

  return data;
}

export async function getOrderWithItems(orderId: string) {
  const { data, error } = await (supabase as any)
    .from("storefront_orders")
    .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderStatusHistory(orderId: string) {
  const { data } = await (supabase as any)
    .from("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function listCustomerOrders(limit = 50) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await (supabase as any)
    .from("storefront_orders")
    .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listMerchantOrders(shopId: string, statusFilter?: string[], limit = 100) {
  let query = (supabase as any)
    .from("storefront_orders")
    .select("*, storefront_order_items(*)")
    .eq("shop_id", shopId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (statusFilter && statusFilter.length > 0) {
    query = query.in("status", statusFilter);
  }

  const { data } = await query;
  return data ?? [];
}
