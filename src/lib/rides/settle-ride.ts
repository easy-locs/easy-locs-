/**
 * settleCompletedRide — Post-ride wallet settlement (debit rider, credit driver).
 */
import { supabase } from "@/integrations/supabase/client";

export async function settleCompletedRide(params: {
  rideRequestId: string;
  threadId: string;
  riderId: string;
  driverId: string;
  amount: number;
}) {
  const { rideRequestId, threadId, riderId, driverId, amount } = params;

  const txRows = [
    {
      user_id: riderId,
      direction: "debit",
      amount,
      currency: "AED",
      context_type: "ride",
      context_id: rideRequestId,
      reference_id: threadId,
      status: "completed",
    },
    {
      user_id: driverId,
      direction: "credit",
      amount,
      currency: "AED",
      context_type: "ride",
      context_id: rideRequestId,
      reference_id: threadId,
      status: "completed",
    },
  ];

  const { error: txError } = await supabase
    .from("wallet_transactions" as any)
    .insert(txRows as any);

  if (txError) throw txError;

  const { error: rideError } = await supabase
    .from("ride_requests" as any)
    .update({
      settlement_status: "settled",
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", rideRequestId);

  if (rideError) throw rideError;

  return { ok: true };
}
