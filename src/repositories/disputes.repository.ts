/**
 * disputes.repository — All dispute DB operations.
 */
import { supabase } from "@/integrations/supabase/client";

export async function resolveDispute(disputeId: string) {
  await supabase
    .from("ride_disputes" as any)
    .update({ status: "resolved", updated_at: new Date().toISOString() } as any)
    .eq("id", disputeId);
}

export async function refundDispute(disputeId: string, rideRequestId: string) {
  await supabase
    .from("ride_disputes" as any)
    .update({ status: "refunded", updated_at: new Date().toISOString() } as any)
    .eq("id", disputeId);

  await (supabase as any)
    .from("mobility_jobs")
    .update({
      status: "cancelled",
      cancel_reason: "dispute_refunded",
      updated_at: new Date().toISOString(),
    })
    .eq("id", rideRequestId);
}
