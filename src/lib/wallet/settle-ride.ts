/**
 * settleRide — Post-ride wallet settlement (debit rider, credit driver) + mark settled.
 */
import { supabase } from "@/integrations/supabase/client";

export async function settleRide(params: {
  rideRequestId: string;
  riderId: string;
  driverId: string;
  amount: number;
  threadId?: string | null;
}) {
  const { rideRequestId, riderId, driverId, amount, threadId } = params;

  const rows = [
    {
      user_id: riderId,
      direction: "debit",
      amount,
      currency: "AED",
      context_type: "ride",
      context_id: rideRequestId,
      reference_id: threadId ?? null,
      status: "completed",
    },
    {
      user_id: driverId,
      direction: "credit",
      amount,
      currency: "AED",
      context_type: "ride",
      context_id: rideRequestId,
      reference_id: threadId ?? null,
      status: "completed",
    },
  ];

  const { error: txError } = await supabase
    .from("wallet_transactions" as any)
    .insert(rows as any);

  if (txError) throw txError;

  const { error: updateError } = await supabase
    .from("ride_requests" as any)
    .update({
      settlement_status: "settled",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", rideRequestId);

  if (updateError) throw updateError;

  return { ok: true };
}
