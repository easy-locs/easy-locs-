import { db } from "@/services/db";

export async function requestDriverPayout(params: {
  driverId: string;
  amount: number;
  method?: string;
}) {
  const { driverId, amount, method = "manual" } = params;

  const { error } = await db("driver_payouts" as any)
    .insert({
      driver_id: driverId,
      amount,
      method,
      payout_status: "pending",
    } as any);

  if (error) throw error;
  return { ok: true };
}
