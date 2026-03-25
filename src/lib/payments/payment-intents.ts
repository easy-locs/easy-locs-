import { supabase } from "@/integrations/supabase/client";
import { getGuestId } from "@/lib/guest-session";

async function tryGetCurrentUserId(): Promise<string | null> {
  try {
    const { data } = await supabase.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

export async function createPaymentIntent(params: {
  workspaceId?: string;
  orderId?: string;
  cartId?: string;
  provider?: "stripe" | "checkout" | "cash" | "wallet" | "mixed" | "manual";
  currency?: string;
  amount: number;
  paymentMethodType?: "card" | "apple_pay" | "wallet" | "cash";
  metadata?: Record<string, any>;
}) {
  const userId = await tryGetCurrentUserId();
  const guestId = userId ? null : getGuestId();

  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .insert({
      workspace_id: params.workspaceId ?? null,
      order_id: params.orderId ?? null,
      cart_id: params.cartId ?? null,
      user_id: userId,
      guest_id: guestId,
      provider: params.provider ?? "manual",
      currency: params.currency ?? "AED",
      amount: params.amount,
      status: "created",
      payment_method_type: params.paymentMethodType ?? "card",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function markPaymentIntentPaid(paymentIntentId: string, externalIntentId?: string) {
  const { data, error } = await (supabase as any)
    .from("payment_intents")
    .update({
      status: "paid",
      external_intent_id: externalIntentId ?? null,
      paid_at: new Date().toISOString(),
    })
    .eq("id", paymentIntentId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
