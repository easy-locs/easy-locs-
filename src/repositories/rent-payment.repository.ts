/**
 * rent-payment.repository — Rent call update ops.
 */
import { supabase } from "@/integrations/supabase/client";

export async function markRentCallPaid(rentCallId: string, amount: number) {
  const { error } = await supabase.from("rent_calls").update({
    paid: true, paid_amount: amount, paid_date: new Date().toISOString(),
  } as any).eq("id", rentCallId);
  if (error) throw error;
}
