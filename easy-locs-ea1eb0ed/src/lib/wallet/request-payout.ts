/**
 * requestDriverPayout — Driver requests a withdrawal from earnings.
 */
import { supabase } from "@/integrations/supabase/client";

export async function requestDriverPayout(params: {
  driverId: string;
  amount: number;
  method?: string;
}) {
  const { driverId, amount, method = "manual" } = params;

  const { error } = await supabase
    .from("driver_payouts" as any)
    .insert({
      driver_id: driverId,
      amount,
      method,
      payout_status: "pending",
    } as any);

  if (error) throw error;
  return { ok: true };
}
