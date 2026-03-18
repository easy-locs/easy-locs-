import { supabase } from "@/integrations/supabase/client";

export async function lockOrderForPayout(params: {
  orderId: string;
  beneficiaryType: "merchant" | "driver";
  notes?: string;
}) {
  const { data: existing } = await (supabase as any)
    .from("order_payout_locks")
    .select("id")
    .eq("order_id", params.orderId)
    .maybeSingle();

  if (existing) {
    throw new Error("Order already locked for payout");
  }

  const { data, error } = await (supabase as any)
    .from("order_payout_locks")
    .insert({
      order_id: params.orderId,
      beneficiary_type: params.beneficiaryType,
      notes: params.notes ?? null,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function isOrderPayoutLocked(orderId: string): Promise<boolean> {
  const { data } = await (supabase as any)
    .from("order_payout_locks")
    .select("id")
    .eq("order_id", orderId)
    .maybeSingle();

  return !!data;
}
