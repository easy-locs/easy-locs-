import { supabase } from "@/integrations/supabase/client";

export async function predictOrderEta(params: {
  workspaceId?: string;
  orderId: string;
  merchantProfileId?: string;
  driverUserId?: string;
  area?: string;
  prepTimeMin?: number;
  travelTimeMin?: number;
  queueTimeMin?: number;
  confidence?: number;
}) {
  const prep = Number(params.prepTimeMin ?? 12);
  const travel = Number(params.travelTimeMin ?? 18);
  const queue = Number(params.queueTimeMin ?? 4);
  const total = prep + travel + queue;

  const { data, error } = await (supabase as any)
    .from("delivery_eta_predictions")
    .insert({
      workspace_id: params.workspaceId ?? null,
      order_id: params.orderId,
      merchant_profile_id: params.merchantProfileId ?? null,
      driver_user_id: params.driverUserId ?? null,
      area: params.area ?? null,
      prep_time_min: prep,
      travel_time_min: travel,
      queue_time_min: queue,
      total_eta_min: total,
      confidence: params.confidence ?? 0.72,
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getLatestEtaPrediction(orderId: string) {
  const { data, error } = await (supabase as any)
    .from("delivery_eta_predictions")
    .select("*")
    .eq("order_id", orderId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
}
