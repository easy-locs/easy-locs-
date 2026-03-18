import { supabase } from "@/integrations/supabase/client";

export async function addCompetitorPriceSnapshot(params: {
  workspaceId?: string;
  merchantProfileId?: string;
  competitorName: string;
  itemName: string;
  area?: string;
  observedPrice: number;
  currency?: string;
  metadata?: Record<string, any>;
}) {
  const { data, error } = await (supabase as any)
    .from("competitor_price_snapshots")
    .insert({
      workspace_id: params.workspaceId ?? null,
      merchant_profile_id: params.merchantProfileId ?? null,
      competitor_name: params.competitorName,
      item_name: params.itemName,
      area: params.area ?? null,
      observed_price: params.observedPrice,
      currency: params.currency ?? "AED",
      metadata: params.metadata ?? {},
    })
    .select("*")
    .single();

  if (error) throw error;
  return data;
}

export async function getCompetitorPricingSummary(merchantProfileId: string) {
  const { data, error } = await (supabase as any)
    .from("competitor_price_snapshots")
    .select("*")
    .eq("merchant_profile_id", merchantProfileId)
    .order("observed_at", { ascending: false })
    .limit(100);

  if (error) throw error;

  const rows = data ?? [];
  const avg = rows.length > 0
    ? Number((rows.reduce((sum: number, r: any) => sum + Number(r.observed_price ?? 0), 0) / rows.length).toFixed(2))
    : 0;

  return { rows, avgObservedPrice: avg };
}
