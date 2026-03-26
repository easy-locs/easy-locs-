/**
 * offer-accept-guard — Safe offer acceptance with ownership + state validation.
 */
import { supabase } from "@/integrations/supabase/client";

export async function acceptOfferSafely(offerId: string, riderUserId: string) {
  const { data: offer } = await supabase
    .from("mobility_job_offers")
    .select("id,job_id,status,rider_user_id")
    .eq("id", offerId)
    .maybeSingle();

  if (!offer) throw new Error("Offer not found");
  if ((offer as any).status !== "pending") throw new Error("Offer no longer available");
  if ((offer as any).rider_user_id !== riderUserId) throw new Error("Offer ownership mismatch");

  const { data: acceptedExisting } = await supabase
    .from("mobility_job_offers")
    .select("id")
    .eq("job_id", (offer as any).job_id)
    .eq("status", "accepted")
    .limit(1)
    .maybeSingle();

  if (acceptedExisting) {
    throw new Error("Ride already assigned");
  }

  const { error: offerError } = await supabase
    .from("mobility_job_offers")
    .update({
      status: "accepted",
      responded_at: new Date().toISOString(),
    } as any)
    .eq("id", offerId)
    .eq("status", "pending");

  if (offerError) throw offerError;

  const { error: jobError } = await supabase
    .from("mobility_jobs")
    .update({
      status: "accepted",
      rider_user_id: riderUserId,
      accepted_at: new Date().toISOString(),
    } as any)
    .eq("id", (offer as any).job_id)
    .in("status", ["searching", "offered"]);

  if (jobError) throw jobError;

  // Expire remaining pending offers for this job
  await supabase
    .from("mobility_job_offers")
    .update({
      status: "expired",
      responded_at: new Date().toISOString(),
    } as any)
    .eq("job_id", (offer as any).job_id)
    .eq("status", "pending");
}
