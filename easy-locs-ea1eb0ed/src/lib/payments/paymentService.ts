import { db as supabase } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";
import type {
  CreateCheckoutPaymentInput,
  CapturePaymentInput,
  RefundPaymentInput,
} from "./paymentTypes";

async function writeOrderPaymentStatus(orderId: string, payment_status: string, payment_intent_id?: string | null) {
  const update: Record<string, unknown> = {
    payment_status,
    updated_at: new Date().toISOString(),
  };
  if (payment_intent_id !== undefined) {
    update.payment_intent_id = payment_intent_id;
  }
  const { error } = await supabase
    .from("orders")
    .update(update as any)
    .eq("id", orderId);

  if (error) throw error;
}

export async function createCheckoutPayment(input: CreateCheckoutPaymentInput) {
  const { data, error } = await supabase.functions.invoke("create-checkout-payment", {
    body: input,
  });
  if (error) throw error;

  await writeOrderPaymentStatus(input.orderId, "pending", data?.paymentIntentId ?? null);

  return data as {
    provider: "stripe";
    clientSecret?: string;
    checkoutUrl?: string;
    paymentIntentId: string;
    status: string;
  };
}

export async function confirmWalletOrCashOrder(params: {
  orderId: string;
  amount: number;
  currency: string;
  customerUserId: string;
  merchantId?: string | null;
  paymentMethodType: "wallet" | "cash";
}) {
  const { orderId, amount, currency, customerUserId, merchantId, paymentMethodType } = params;

  await writeOrderPaymentStatus(
    orderId,
    paymentMethodType === "wallet" ? "captured" : "pending",
    `offline_${orderId}`
  );

  if (paymentMethodType === "wallet") {
    platformBus.emit(
      "PAYMENT_SUCCESS",
      {
        orderId,
        amount,
        currency,
        merchantId: merchantId ?? null,
        customerUserId,
        paymentMethodType,
      },
      "system"
    );
  }

  return {
    paymentIntentId: `offline_${orderId}`,
    status: paymentMethodType === "wallet" ? "succeeded" : "pending",
  };
}

export async function capturePayment(input: CapturePaymentInput) {
  const { data, error } = await supabase.functions.invoke("capture-payment", {
    body: input,
  });
  if (error) throw error;

  await writeOrderPaymentStatus(input.orderId, "captured", input.paymentIntentId);

  const { data: order } = await supabase
    .from("orders")
    .select("id,total_amount,currency,customer_user_id,merchant_profile_id")
    .eq("id", input.orderId)
    .maybeSingle();

  platformBus.emit(
    "PAYMENT_SUCCESS",
    {
      orderId: input.orderId,
      amount: Number(order?.total_amount ?? 0),
      currency: order?.currency ?? "AED",
      merchantId: order?.merchant_profile_id ?? null,
      customerUserId: order?.customer_user_id ?? null,
      paymentMethodType: "card",
    },
    "system"
  );

  return data;
}

export async function refundPayment(input: RefundPaymentInput) {
  const { data, error } = await supabase.functions.invoke("refund-payment", {
    body: input,
  });
  if (error) throw error;

  await writeOrderPaymentStatus(input.orderId, "refunded", input.paymentIntentId);

  const { error: orderErr } = await supabase
    .from("orders")
    .update({ status: "refunded", updated_at: new Date().toISOString() } as any)
    .eq("id", input.orderId);

  if (orderErr) throw orderErr;

  return data;
}
