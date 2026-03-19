/**
 * Demand Generation Engine
 * Captures and scores demand signals before activation.
 */
import { supabase } from "@/integrations/supabase/client";

export interface DemandScore {
  entityId: string;
  entityType: "merchant" | "city" | "category";
  pageViews: number;
  clicks: number;
  waitlistSignups: number;
  notifyRequests: number;
  demandScore: number;
}

export async function trackDemandSignal(params: {
  entityId: string;
  entityType: string;
  signalType: "page_view" | "click" | "waitlist_signup" | "notify_request";
  metadata?: Record<string, unknown>;
}) {
  await (supabase as any).from("ad_events").insert({
    target_id: params.entityId,
    target_type: params.entityType,
    event_type: params.signalType,
    placement: "organic",
    metadata_json: params.metadata ?? {},
  } as any);
}

export async function computeDemandScore(entityId: string, entityType: string): Promise<DemandScore> {
  const { count: views } = await (supabase as any)
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("target_id", entityId)
    .eq("event_type", "page_view");

  const { count: clicks } = await (supabase as any)
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("target_id", entityId)
    .eq("event_type", "click");

  const { count: waitlist } = await (supabase as any)
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("target_id", entityId)
    .eq("event_type", "waitlist_signup");

  const { count: notify } = await (supabase as any)
    .from("ad_events")
    .select("id", { count: "exact", head: true })
    .eq("target_id", entityId)
    .eq("event_type", "notify_request");

  const v = views ?? 0;
  const c = clicks ?? 0;
  const w = waitlist ?? 0;
  const n = notify ?? 0;

  const demandScore = Math.min(v * 1 + c * 3 + w * 10 + n * 8, 100);

  return { entityId, entityType: entityType as any, pageViews: v, clicks: c, waitlistSignups: w, notifyRequests: n, demandScore };
}
