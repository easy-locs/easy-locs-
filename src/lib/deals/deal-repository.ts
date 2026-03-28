/**
 * deal-repository — All Deal Room DB reads/writes.
 */
import { supabase } from "@/integrations/supabase/client";

export async function fetchDeals(userId: string) {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .or(`buyer_user_id.eq.${userId},seller_user_id.eq.${userId}`)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function fetchDealById(dealId: string) {
  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", dealId)
    .single();
  if (error) throw error;
  return data;
}

export async function updateDealStatus(dealId: string, status: string) {
  const { error } = await supabase
    .from("deals")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", dealId);
  if (error) throw error;
}

export async function fetchDealTimeline(dealId: string) {
  const { data, error } = await supabase
    .from("deal_timeline")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function addDealTimelineEvent(
  dealId: string,
  eventType: string,
  actorId: string,
  payload: Record<string, any> = {},
) {
  const { error } = await supabase.from("deal_timeline").insert({
    deal_id: dealId,
    event_type: eventType,
    actor_user_id: actorId,
    payload_json: payload,
  });
  if (error) throw error;
}

export async function createDealOffer(
  dealId: string,
  userId: string,
  amount: number,
  currency: string,
  expiresAt: string | null,
  message?: string,
) {
  const { error } = await supabase.from("deal_offers").insert({
    deal_id: dealId,
    offered_by: userId,
    amount,
    currency,
    expires_at: expiresAt,
    message: message ?? null,
    status: "pending",
  });
  if (error) throw error;
}
