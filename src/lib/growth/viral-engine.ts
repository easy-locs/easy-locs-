/**
 * Viral Loop Engine
 * Tracks referral and viral mechanics.
 */
import { supabase } from "@/integrations/supabase/client";

export type ViralLoopType = "customer_request_restaurant" | "merchant_invite_customer" | "customer_share_store";

export async function trackViralEvent(params: {
  loopType: ViralLoopType;
  sourceUserId?: string;
  targetEntityId: string;
  targetEntityType: string;
  metadata?: Record<string, unknown>;
}) {
  await (supabase as any).from("ad_events").insert({
    target_id: params.targetEntityId,
    target_type: params.targetEntityType,
    event_type: `viral_${params.loopType}`,
    placement: "viral",
    user_id: params.sourceUserId,
    metadata_json: params.metadata ?? {},
  } as any);
}

export async function getViralMetrics(entityId: string): Promise<{
  totalReferrals: number;
  customerRequests: number;
  merchantInvites: number;
  storeShares: number;
}> {
  const [requests, invites, shares] = await Promise.all([
    (supabase as any).from("ad_events").select("id", { count: "exact", head: true })
      .eq("target_id", entityId).eq("event_type", "viral_customer_request_restaurant"),
    (supabase as any).from("ad_events").select("id", { count: "exact", head: true })
      .eq("target_id", entityId).eq("event_type", "viral_merchant_invite_customer"),
    (supabase as any).from("ad_events").select("id", { count: "exact", head: true })
      .eq("target_id", entityId).eq("event_type", "viral_customer_share_store"),
  ]);

  const r = requests.count ?? 0;
  const i = invites.count ?? 0;
  const s = shares.count ?? 0;

  return { totalReferrals: r + i + s, customerRequests: r, merchantInvites: i, storeShares: s };
}
