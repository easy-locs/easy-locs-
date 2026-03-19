/**
 * Dispatch v1 — Legacy wrapper redirecting to canonical dispatch_jobs_v2.
 * Maintains backward compatibility for existing callers.
 */
import { supabase } from "@/integrations/supabase/client";

export async function createDispatchJob(params: {
  workspaceId?: string;
  orderId?: string;
  sellerId?: string;
  buyerId?: string;
  pickupLabel: string;
  dropoffLabel: string;
  quotedFee?: number;
  currency?: string;
}) {
  // Redirect to canonical dispatch_jobs_v2
  const { data, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .insert({
      order_id: params.orderId ?? null,
      merchant_profile_id: params.sellerId ?? "unknown",
      customer_user_id: params.buyerId ?? null,
      country_code: "AE",
      pickup_lat: 0,
      pickup_lng: 0,
      dropoff_lat: 0,
      dropoff_lng: 0,
      delivery_fee: params.quotedFee ?? 0,
      currency: params.currency ?? "AED",
      dispatch_status: "open",
    } as any)
    .select("*")
    .single();

  if (error) throw error;
  return data as any;
}

export async function submitDispatchBid(params: {
  jobId: string;
  driverId: string;
  bidType?: "fixed" | "progressive" | "accept_quote";
  amount?: number;
  etaMinutes?: number;
}) {
  // Create a mission offer in canonical table
  const { data, error } = await (supabase as any)
    .from("driver_mission_offers")
    .insert({
      dispatch_job_id: params.jobId,
      driver_profile_id: params.driverId,
      offer_status: "sent",
      ranking_score: params.amount ?? 0,
      ranking_reason: { bid_type: params.bidType, eta_minutes: params.etaMinutes },
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({ dispatch_status: "broadcasted" } as any)
    .eq("id", params.jobId);

  return data as any;
}

export async function acceptDispatchBid(params: { bidId: string }) {
  const { data: offer, error } = await (supabase as any)
    .from("driver_mission_offers")
    .update({ offer_status: "accepted", responded_at: new Date().toISOString() } as any)
    .eq("id", params.bidId)
    .select("*")
    .single();

  if (error) throw error;

  await (supabase as any)
    .from("dispatch_jobs_v2")
    .update({
      assigned_driver_id: offer.driver_profile_id,
      dispatch_status: "assigned",
      assigned_at: new Date().toISOString(),
    } as any)
    .eq("id", offer.dispatch_job_id);

  // Mark other offers
  await (supabase as any)
    .from("driver_mission_offers")
    .update({ offer_status: "won_by_other" } as any)
    .eq("dispatch_job_id", offer.dispatch_job_id)
    .neq("id", offer.id)
    .in("offer_status", ["sent"]);

  return offer as any;
}

export async function updateDispatchJobStatus(params: {
  jobId: string;
  status: "open" | "broadcast" | "assigned" | "picked_up" | "delivered" | "failed" | "cancelled";
}) {
  // Map legacy status to canonical dispatch_status
  const statusMap: Record<string, string> = {
    open: "open",
    broadcast: "broadcasted",
    assigned: "assigned",
    picked_up: "picked_up",
    delivered: "delivered",
    failed: "failed",
    cancelled: "cancelled",
  };

  const patch: Record<string, any> = { dispatch_status: statusMap[params.status] ?? params.status };
  if (params.status === "delivered") patch.delivered_at = new Date().toISOString();
  if (params.status === "picked_up") patch.picked_up_at = new Date().toISOString();

  const { data, error } = await (supabase as any)
    .from("dispatch_jobs_v2")
    .update(patch as any)
    .eq("id", params.jobId)
    .select("*")
    .single();

  if (error) throw error;
  return data as any;
}
