/**
 * QR Order Flow — Full flow from QR scan to paid order in kitchen.
 * Connected to wallet engine, POS, and kitchen display.
 */
import { supabase } from "@/integrations/supabase/client";
import { walletTransfer } from "@/payments/wallet-hooks";
type OrderMode = "dine_in" | "takeaway" | "delivery" | "room_service";
import { platformBus } from "@/lib/shared/platform-bus";
import { resolveTransactionCurrency } from "@/lib/currency";

// ── Types ─────────────────────────────────────────────────
export interface QrOrderContext {
  targetType: "global_menu" | "table" | "counter" | "room_service";
  targetCode: string;
  tableNumber?: string;
  merchantProfileId: string;
  storefrontPageId?: string;
  currency?: string;
  countryCode?: string;
}

export interface QrCartItem {
  catalogItemId: string;
  title: string;
  price: number;
  quantity: number;
  variantId?: string;
  notes?: string;
}

export interface QrOrderResult {
  orderId: string;
  posOrderId: string;
  paymentStatus: string;
  walletStatus: string;
  kitchenStatus: string;
  totalAmount: number;
  currency: string;
}

// ── 1. Resolve QR target ──────────────────────────────────
export async function resolveQrTarget(targetCode: string): Promise<QrOrderContext | null> {
  const { data } = await (supabase as any)
    .from("qr_order_targets")
    .select("*, merchant_onboarding_profiles:merchant_profile_id(currency, country), storefront_pages:storefront_page_id(currency, country)")
    .eq("target_code", targetCode)
    .eq("active", true)
    .maybeSingle();

  if (!data) return null;

  const merchantCurrency = data.merchant_onboarding_profiles?.currency;
  const merchantCountry = data.merchant_onboarding_profiles?.country;
  const storefrontCurrency = data.storefront_pages?.currency;

  return {
    targetType: data.target_type,
    targetCode: data.target_code,
    tableNumber: data.table_number,
    merchantProfileId: data.merchant_profile_id,
    storefrontPageId: data.storefront_page_id,
    currency: resolveTransactionCurrency({
      storefrontCurrency,
      merchantCurrency,
      countryCode: merchantCountry,
    }),
    countryCode: merchantCountry ?? "AE",
  };
}

// ── 2. Create order draft ─────────────────────────────────
export async function createQrOrderDraft(params: {
  context: QrOrderContext;
  items: QrCartItem[];
  customerUserId: string;
}) {
  const subtotal = params.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const currency = params.context.currency ?? "AED";
  const orderMode: OrderMode = params.context.targetType === "global_menu" ? "takeaway" : "onsite_qr";

  // Create order
  const { data: order, error: orderErr } = await (supabase as any)
    .from("orders")
    .insert({
      customer_user_id: params.customerUserId,
      merchant_profile_id: params.context.merchantProfileId,
      shop_id: params.context.storefrontPageId ?? null,
      order_mode: orderMode,
      status: "pending",
      payment_status: "pending",
      payment_mode: "wallet_internal",
      total_amount: subtotal,
      gross_amount: subtotal,
      currency,
      country_code: params.context.countryCode,
    } as any)
    .select("*")
    .single();

  if (orderErr) throw orderErr;

  // Create order items
  const items = params.items.map((item, idx) => ({
    order_id: order.id,
    catalog_item_id: item.catalogItemId,
    title: item.title,
    unit_price: item.price,
    quantity: item.quantity,
    subtotal: item.price * item.quantity,
    variant_id: item.variantId ?? null,
    notes: item.notes ?? null,
    sort_order: idx,
  }));

  await (supabase as any).from("order_items").insert(items as any);

  // Create POS order
  const sourceType = params.context.targetType === "table" ? "qr" : "qr";
  const posOrderType = orderMode === "onsite_qr" ? "dine_in" : "takeaway";

  const { data: posOrder } = await (supabase as any)
    .from("pos_orders")
    .insert({
      order_id: order.id,
      source_type: sourceType,
      order_type: posOrderType,
      table_number: params.context.tableNumber ?? null,
      kitchen_status: "pending_payment",
    } as any)
    .select("*")
    .single();

  platformBus.emit("commerce:order_created", {
    orderId: order.id, mode: orderMode, source: "qr", currency,
  }, "system");

  return { orderId: order.id, posOrderId: posOrder?.id, subtotal, currency };
}

// ── 3. Pay QR order (wallet) ──────────────────────────────
export async function payQrOrder(params: {
  orderId: string;
  customerWalletId: string;
  pin: string;
  merchantProfileId: string;
  grossAmount: number;
  countryCode: string;
  city?: string;
  vertical?: string;
  orderMode?: OrderMode;
}): Promise<QrOrderResult> {
  const result = await processUniversalPayment({
    orderId: params.orderId,
    grossAmount: params.grossAmount,
    orderMode: params.orderMode ?? "onsite_qr",
    countryCode: params.countryCode,
    city: params.city,
    vertical: params.vertical ?? "food",
    customerWalletId: params.customerWalletId,
    merchantProfileId: params.merchantProfileId,
    pin: params.pin,
  });

  // Move to kitchen only after successful capture
  if (result.walletStatus === "captured") {
    await (supabase as any)
      .from("pos_orders")
      .update({ kitchen_status: "new" } as any)
      .eq("order_id", params.orderId);

    await (supabase as any)
      .from("orders")
      .update({ status: "preparing" } as any)
      .eq("id", params.orderId);
  }

  return {
    orderId: params.orderId,
    posOrderId: "",
    paymentStatus: result.walletStatus,
    walletStatus: result.walletStatus,
    kitchenStatus: result.walletStatus === "captured" ? "new" : "pending_payment",
    totalAmount: params.grossAmount,
    currency: result.currency,
  };
}

// ── 4. Order state machine ────────────────────────────────
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ["authorized", "cancelled"],
  authorized: ["held_in_escrow", "cancelled", "reversed"],
  held_in_escrow: ["preparing", "review_required", "cancelled", "reversed"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "picked_up", "delivered", "cancelled"],
  served: ["settled"],
  picked_up: ["in_progress"],
  in_progress: ["delivered"],
  delivered: ["settled"],
  review_required: ["preparing", "cancelled", "reversed"],
  settled: [],
  cancelled: ["reversed"],
  reversed: [],
};

export function isValidTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function transitionOrderState(orderId: string, newStatus: string) {
  const { data: order } = await (supabase as any).from("orders").select("status").eq("id", orderId).single();
  if (!order) throw new Error("Order not found");

  if (!isValidTransition(order.status, newStatus)) {
    throw new Error(`Invalid transition: ${order.status} → ${newStatus}`);
  }

  await (supabase as any).from("orders").update({ status: newStatus } as any).eq("id", orderId);

  // Update kitchen status for relevant transitions
  const kitchenMap: Record<string, string> = {
    preparing: "preparing",
    ready: "ready",
    served: "served",
    picked_up: "picked_up",
    cancelled: "cancelled",
  };

  if (kitchenMap[newStatus]) {
    await (supabase as any).from("pos_orders").update({ kitchen_status: kitchenMap[newStatus] } as any).eq("order_id", orderId);
  }

  return { ok: true, previousStatus: order.status, newStatus };
}
