/**
 * orderEngine — Authoritative order creation and status management.
 * Uses storefront_orders + storefront_order_items as the single source of truth.
 */
import { db } from "@/services/db";
import type { CartItem } from "@/stores/cartStore";
import { notifyOrderCreated, notifyOrderDelivered } from "@/lib/engines/notification-event-dispatcher";
import { preTransactionCheck, postTransactionRecord } from "@/lib/security/anti-fraud-guard";
import { platformBus } from "@/lib/shared/platform-bus";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
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
  const { data: { user } } = await db.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  if (input.idempotencyKey) {
    const { data: existing } = await cFrom("storefront_orders")
      .select("id")
      .eq("notes", `idem:${input.idempotencyKey}`)
      .eq("buyer_id", user.id)
      .maybeSingle();
    if (existing) return { order: existing, alreadyExists: true };
  }

  const itemModTotal = (item: CartItem) =>
    (item.modifiers ?? []).reduce((s, m) => s + (m.priceAdjustment ?? 0), 0);
  const subtotalPreCheck = input.items.reduce((sum, i) => sum + (i.unitPrice + itemModTotal(i)) * i.quantity, 0);
  const itemFingerprint = input.items.map(i => `${i.menuItemId}:${i.quantity}:${i.unitPrice + itemModTotal(i)}`).sort().join("|");
  const fraudCheck = preTransactionCheck(user.id, "order", {
    shopId: input.shopId,
    fingerprint: itemFingerprint,
    amount: subtotalPreCheck,
    fulfillment: input.fulfillmentType,
  });
  if (!fraudCheck.pass) {
    throw new Error(`Order blocked: ${fraudCheck.reason}`);
  }

  const subtotal = Number(
    input.items.reduce((sum, i) => sum + (i.unitPrice + itemModTotal(i)) * i.quantity, 0).toFixed(2)
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

  const { data: order, error: orderErr } = await cFrom("storefront_orders")
    .insert(orderPayload)
    .select("*")
    .single();

  if (orderErr) throw orderErr;

  const itemRows = input.items.map((item) => ({
    order_id: order.id,
    item_id: item.menuItemId || null,
    title: item.name,
    unit_price: item.unitPrice + itemModTotal(item),
    quantity: item.quantity,
    total_price: Number(((item.unitPrice + itemModTotal(item)) * item.quantity).toFixed(2)),
    metadata: {
      modifiers: item.modifiers ?? [],
      notes: item.notes ?? "",
      allergens: item.allergens ?? [],
      prep_time_minutes: item.prepTimeMinutes ?? null,
    },
  }));

  const { error: itemsErr } = await cFrom("storefront_order_items")
    .insert(itemRows);

  if (itemsErr) throw itemsErr;

  // Insert initial status history
  await cFrom("order_status_history")
    .insert({
      order_id: order.id,
      status: "pending",
      actor_type: "customer",
      actor_id: user.id,
    });

  notifyOrderCreated(user.id, order.id, input.shopId, total).catch(console.error);

  platformBus.emit("food:order_placed", {
    orderId: order.id,
    shopId: input.shopId,
    buyerId: user.id,
    sellerId: input.sellerId,
    total,
    currency,
    itemCount: input.items.length,
    items_summary: input.items.map(i => `${i.quantity}x ${i.name}`).join(", "),
  }, "order-engine");

  sendOrderConfirmationEmail(user.email || "", order.id, input.items, total, currency, input.fulfillmentType).catch(console.error);

  postTransactionRecord(fraudCheck.idempotencyKey, { orderId: order.id });

  return { order, alreadyExists: false };
}

async function sendOrderConfirmationEmail(
  email: string,
  orderId: string,
  items: CartItem[],
  total: number,
  currency: string,
  fulfillment: FulfillmentType,
) {
  if (!email) return;
  const itemsHtml = items.map(i =>
    `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${i.name}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${i.quantity}×</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${(i.unitPrice * i.quantity).toFixed(2)} ${currency}</td></tr>`
  ).join("");

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:0 auto;padding:24px">
      <h2 style="color:#1a1a1a;margin:0 0 4px">Order Confirmed</h2>
      <p style="color:#666;font-size:14px;margin:0 0 20px">Order #${orderId.slice(0, 8).toUpperCase()}</p>
      <table style="width:100%;border-collapse:collapse;font-size:14px">
        <thead><tr style="background:#f5f5f5"><th style="padding:8px 12px;text-align:left">Item</th><th style="padding:8px 12px;text-align:right">Qty</th><th style="padding:8px 12px;text-align:right">Price</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
        <tfoot><tr><td colspan="2" style="padding:10px 12px;font-weight:700">Total</td><td style="padding:10px 12px;text-align:right;font-weight:700;color:#1a73e8">${total.toFixed(2)} ${currency}</td></tr></tfoot>
      </table>
      <p style="color:#666;font-size:13px;margin:16px 0 0">Fulfillment: ${fulfillment.replace(/_/g, " ")}</p>
      <p style="color:#999;font-size:12px;margin:24px 0 0">Thank you for your order!</p>
    </div>
  `.trim();

  try {
    await db.functions.invoke("send-email", {
      body: { to: email, subject: `Order Confirmed #${orderId.slice(0, 8).toUpperCase()}`, html },
    });
  } catch {
    console.warn("[orderEngine] Email send skipped (edge function may not be deployed)");
  }
}

export async function updateStorefrontOrderStatus(params: {
  orderId: string;
  status: string;
  actorType?: string;
  notes?: string;
}) {
  const { data: { user } } = await db.auth.getUser();

  const patch: Record<string, any> = {
    status: params.status,
    updated_at: new Date().toISOString(),
  };

  if (params.status === "delivered") {
    patch.payment_status = "pending_confirmation";
  }

  const { data, error } = await cFrom("storefront_orders")
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
  await cFrom("order_status_history")
    .insert({
      order_id: params.orderId,
      status: params.status,
      actor_type: params.actorType ?? "system",
      actor_id: user?.id ?? null,
      notes: params.notes ?? null,
    });

  return data;
}

export async function updateOrderPaymentStatus(
  orderId: string,
  paymentStatus: string,
  metadata?: { stripe_payment_intent_id?: string; payment_ref?: string },
) {
  const updatePayload: Record<string, unknown> = {
    payment_status: paymentStatus,
    updated_at: new Date().toISOString(),
  };
  if (metadata?.stripe_payment_intent_id) {
    updatePayload.stripe_payment_intent_id = metadata.stripe_payment_intent_id;
  }
  if (metadata?.payment_ref) {
    updatePayload.payment_ref = metadata.payment_ref;
  }

  const { error } = await cFrom("storefront_orders")
    .update(updatePayload)
    .eq("id", orderId);

  if (error) throw error;
}

export async function getOrderWithItems(orderId: string) {
  const { data, error } = await cFrom("storefront_orders")
    .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
    .eq("id", orderId)
    .single();

  if (error) throw error;
  return data;
}

export async function getOrderStatusHistory(orderId: string) {
  const { data } = await cFrom("order_status_history")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });

  return data ?? [];
}

export async function listCustomerOrders(limit = 50) {
  const { data: { user } } = await db.auth.getUser();
  if (!user) return [];

  const { data } = await cFrom("storefront_orders")
    .select("*, storefront_order_items(*), storefront_pages!storefront_orders_shop_id_fkey(name, slug, logo_url)")
    .eq("buyer_id", user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  return data ?? [];
}

export async function listMerchantOrders(shopId: string, statusFilter?: string[], limit = 100) {
  let query = cFrom("storefront_orders")
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
