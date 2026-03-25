/**
 * Boost Analytics Engine — Aggregates daily boost campaign performance.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runBoostAnalytics() {
  const today = new Date().toISOString().split("T")[0];

  const { data: campaigns } = await db
    .from("boost_campaigns")
    .select("id, status, total_budget, spent")
    .eq("status", "active");

  let processed = 0, paused = 0;
  for (const c of campaigns ?? []) {
    // Check budget exhaustion
    if (Number(c.spent ?? 0) >= Number(c.total_budget ?? 0) && Number(c.total_budget ?? 0) > 0) {
      await db.from("boost_campaigns").update({ status: "paused" }).eq("id", c.id);
      paused++;
      continue;
    }

    // Count today's impressions and clicks
    const { count: impressions } = await db
      .from("boost_impressions")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .gte("rendered_at", today);

    const { count: clicks } = await db
      .from("boost_clicks")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", c.id)
      .gte("clicked_at", today);

    const ctr = (impressions ?? 0) > 0 ? ((clicks ?? 0) / (impressions ?? 0)) * 100 : 0;

    // Upsert daily analytics
    await db.from("boost_analytics_daily").upsert({
      campaign_id: c.id,
      day: today,
      impressions: impressions ?? 0,
      clicks: clicks ?? 0,
      ctr: Math.round(ctr * 100) / 100,
    }, { onConflict: "campaign_id,day" });

    processed++;
  }

  return { campaigns: campaigns?.length ?? 0, processed, paused };
}
