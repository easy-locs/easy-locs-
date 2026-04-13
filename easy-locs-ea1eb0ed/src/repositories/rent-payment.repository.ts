/**
 * rent-payment.repository — Rent call update ops.
 */
import { db } from "@/services/db";

export async function markRentCallPaid(rentCallId: string, amount: number) {
  const { error } = await db("rent_calls").update({
    paid: true, paid_amount: amount, paid_date: new Date().toISOString(),
  } as any).eq("id", rentCallId);
  if (error) throw error;
}
