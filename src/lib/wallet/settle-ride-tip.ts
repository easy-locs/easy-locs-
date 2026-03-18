/**
 * settleRideTip — Post-ride tip settlement (debit rider, credit driver).
 */
import { supabase } from "@/integrations/supabase/client";

export async function settleRideTip(params: {
  rideRequestId: string;
  riderId: string;
  driverId: string;
  tipAmount: number;
  threadId?: string | null;
}) {
  const { rideRequestId, riderId, driverId, tipAmount, threadId } = params;

  if (!tipAmount || tipAmount <= 0) return { ok: true, skipped: true };

  const rows = [
    {
      user_id: riderId,
      direction: "debit",
      amount: tipAmount,
      currency: "AED",
      context_type: "ride_tip",
      context_id: rideRequestId,
      reference_id: threadId ?? null,
      status: "completed",
      metadata_json: {
        category: "tip",
        ride_request_id: rideRequestId,
      },
    },
    {
      user_id: driverId,
      direction: "credit",
      amount: tipAmount,
      currency: "AED",
      context_type: "ride_tip",
      context_id: rideRequestId,
      reference_id: threadId ?? null,
      status: "completed",
      metadata_json: {
        category: "tip",
        ride_request_id: rideRequestId,
      },
    },
  ];

  const { error: txError } = await supabase
    .from("wallet_transactions" as any)
    .insert(rows as any);

  if (txError) throw txError;

  const { error: rideError } = await supabase
    .from("ride_requests" as any)
    .update({
      tip_amount: tipAmount,
      tip_settled: true,
      updated_at: new Date().toISOString(),
    } as any)
    .eq("id", rideRequestId);

  if (rideError) throw rideError;

  return { ok: true };
}
