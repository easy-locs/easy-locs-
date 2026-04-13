/**
 * processPayout — Admin marks a driver payout as paid.
 */
import { db as supabase } from "@/services/db";

export async function processPayout(payoutId: string, reference?: string) {
  const { error } = await supabase
    .from("driver_payouts" as any)
    .update({
      payout_status: "paid",
      reference: reference ?? null,
      processed_at: new Date().toISOString(),
    } as any)
    .eq("id", payoutId);

  if (error) throw error;
  return { ok: true };
}
