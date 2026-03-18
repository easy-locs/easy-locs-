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
  const { data, error } = await supabase
    .from("dispatch_jobs" as any)
    .insert({
      workspace_id: params.workspaceId ?? null,
      order_id: params.orderId ?? null,
      seller_id: params.sellerId ?? null,
      buyer_id: params.buyerId ?? null,
      pickup_label: params.pickupLabel,
      dropoff_label: params.dropoffLabel,
      quoted_fee: params.quotedFee ?? null,
      currency: params.currency ?? "AED",
      status: "open",
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
  const { data, error } = await supabase
    .from("dispatch_bids" as any)
    .insert({
      job_id: params.jobId,
      driver_id: params.driverId,
      bid_type: params.bidType ?? "fixed",
      amount: params.amount ?? null,
      eta_minutes: params.etaMinutes ?? null,
      status: "submitted",
    } as any)
    .select("*")
    .single();

  if (error) throw error;

  await supabase
    .from("dispatch_jobs" as any)
    .update({ status: "broadcast" } as any)
    .eq("id", params.jobId);

  return data as any;
}

export async function acceptDispatchBid(params: { bidId: string }) {
  const { data: bid, error: bidError } = await supabase
    .from("dispatch_bids" as any)
    .update({ status: "accepted" } as any)
    .eq("id", params.bidId)
    .select("*")
    .single();

  if (bidError) throw bidError;

  const b = bid as any;

  const { data: job, error: jobError } = await supabase
    .from("dispatch_jobs" as any)
    .update({ assigned_driver_id: b.driver_id, final_fee: b.amount, status: "assigned" } as any)
    .eq("id", b.job_id)
    .select("*")
    .single();

  if (jobError) throw jobError;

  await supabase
    .from("dispatch_bids" as any)
    .update({ status: "rejected" } as any)
    .eq("job_id", b.job_id)
    .neq("id", b.id)
    .eq("status", "submitted");

  return job as any;
}

export async function updateDispatchJobStatus(params: {
  jobId: string;
  status: "open" | "broadcast" | "assigned" | "picked_up" | "delivered" | "failed" | "cancelled";
}) {
  const patch: Record<string, any> = { status: params.status };
  if (params.status === "delivered") patch.completed_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("dispatch_jobs" as any)
    .update(patch as any)
    .eq("id", params.jobId)
    .select("*")
    .single();

  if (error) throw error;
  return data as any;
}
