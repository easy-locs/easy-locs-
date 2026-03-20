import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/orchestration/platformBus";


export type V1CheckoutInput = {
  merchantId: string;
  merchantName?: string | null;
  customerUserId: string;
  currency?: string;
  items: Array<{
    menuItemId?: string | null;
    name: string;
    quantity: number;
    unitPrice: number;
  }>;
  notes?: string | null;
  paymentMethod: "wallet" | "cash" | "card";
};

export async function createV1OrderDraft(input: V1CheckoutInput) {
  const subtotal = input.items.reduce(
    (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0
  );

  const { data, error } = await (supabase as any)
    .from("orders")
    .insert({
      merchant_id: input.merchantId,
      merchant_name: input.merchantName ?? null,
      customer_user_id: input.customerUserId,
      status: "pending_payment",
      payment_status: input.paymentMethod === "cash" ? "pending" : "unpaid",
      total_amount: subtotal,
      currency: input.currency ?? "AED",
      notes: input.notes ?? null,
      order_type: "delivery",
      updated_at: new Date().toISOString(),
    })
    .select("*")
    .single();

  if (error) throw error;

  const orderId = data.id;

  for (const item of input.items) {
    const { error: itemError } = await (supabase as any).from("order_items").insert({
      order_id: orderId,
      menu_item_id: item.menuItemId ?? null,
      item_name: item.name,
      quantity: Number(item.quantity || 0),
      unit_price: Number(item.unitPrice || 0),
      total_price: Number(item.quantity || 0) * Number(item.unitPrice || 0),
    });

    if (itemError) throw itemError;
  }

  await platformBus.emit(
    "ORDER_CREATED",
    {
      orderId,
      merchantId: input.merchantId,
      customerUserId: input.customerUserId,
      amount: subtotal,
      currency: input.currency ?? "AED",
    },
    { source: "customerOrderFlow:createV1OrderDraft" }
  );

  return data;
}

export async function markV1OrderPaid(params: {
  orderId: string;
  amount: number;
  currency: string;
  merchantId: string;
  customerUserId: string;
  paymentMethodType: "wallet" | "cash" | "card";
}) {
  const { error } = await (supabase as any)
    .from("orders")
    .update({
      payment_status: params.paymentMethodType === "cash" ? "pending" : "captured",
      status: params.paymentMethodType === "cash" ? "confirmed" : "paid",
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.orderId);

  if (error) throw error;

  if (params.paymentMethodType !== "cash") {
    await platformBus.emit(
      "PAYMENT_SUCCESS",
      {
        orderId: params.orderId,
        amount: params.amount,
        currency: params.currency,
        merchantId: params.merchantId,
        customerUserId: params.customerUserId,
        paymentMethodType: params.paymentMethodType,
      },
      { source: "customerOrderFlow:markV1OrderPaid" }
    );
  }

  return true;
}

export async function getV1OrderTracking(orderId: string) {
  const { data, error } = await (supabase as any)
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error) throw error;
  return data;
}
