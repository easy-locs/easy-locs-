import { supabase } from "@/integrations/supabase/client";
import type { DemandCaptureInput } from "@/lib/growth/types";

export async function captureDemandEvent(input: DemandCaptureInput) {
  const payload = {
    storefront_page_id: input.storefrontPageId ?? null,
    merchant_profile_id: input.merchantProfileId ?? null,
    city: input.city ?? null,
    country_code: input.countryCode ?? null,
    vertical: input.vertical ?? null,
    event_type: input.eventType,
    session_id: input.sessionId ?? null,
    user_id: input.userId ?? null,
    metadata_json: input.metadata ?? {},
  };

  const { error } = await (supabase as any)
    .from("growth_demand_events")
    .insert(payload);

  if (error) throw error;
  return { ok: true };
}

export async function getMerchantDemandSummary(merchantProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("growth_demand_events")
    .select("event_type, created_at")
    .eq("merchant_profile_id", merchantProfileId);

  if (error) throw error;

  const rows = data ?? [];
  const total = rows.length;
  const interest = rows.filter((r: any) =>
    ["coming_soon_interest", "claim_click", "activation_click", "waitlist_submit"].includes(r.event_type)
  ).length;

  return {
    totalEvents: total,
    interestEvents: interest,
    lastEventAt: rows[0]?.created_at ?? null,
  };
}
