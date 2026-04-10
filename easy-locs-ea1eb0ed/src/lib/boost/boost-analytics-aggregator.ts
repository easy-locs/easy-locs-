/**
 * Boost Analytics Daily Aggregator
 * Computes daily stats per campaign from raw impression/click/lead tables.
 * Called client-side on dashboard load or server-side via cron.
 */
import { db } from "@/services/db";

export async function aggregateBoostAnalyticsDaily(campaignId: string) {
  const today = new Date().toISOString().slice(0, 10);

  try {
    // Fetch raw counts for today
    const [impressionsRes, clicksRes, leadsRes, campaignRes] = await Promise.all([
      db
        .from("boost_impressions")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gte("rendered_at", `${today}T00:00:00Z`)
        .lt("rendered_at", `${today}T23:59:59Z`),
      db
        .from("boost_clicks")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gte("clicked_at", `${today}T00:00:00Z`)
        .lt("clicked_at", `${today}T23:59:59Z`),
      db
        .from("boost_leads")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaignId)
        .gte("created_at", `${today}T00:00:00Z`)
        .lt("created_at", `${today}T23:59:59Z`),
      db
        .from("boost_campaigns")
        .select("spent, daily_budget, total_budget")
        .eq("id", campaignId)
        .single(),
    ]);

    const impressions = impressionsRes.count ?? 0;
    const clicks = clicksRes.count ?? 0;
    const leads = leadsRes.count ?? 0;
    const campaign = campaignRes.data;

    const ctr = impressions > 0 ? clicks / impressions : 0;
    const cpl = leads > 0 ? (campaign?.daily_budget ?? 0) / leads : 0;
    const spend = campaign?.daily_budget ?? 0;
    const roiProxy = leads > 0 ? leads * 10 / Math.max(spend, 1) : 0;

    // Upsert daily analytics
    await db
      .from("boost_analytics_daily")
      .upsert(
        {
          campaign_id: campaignId,
          day: today,
          impressions,
          clicks,
          leads,
          spend,
          ctr: Math.round(ctr * 10000) / 10000,
          cpl: Math.round(cpl * 100) / 100,
          roi_proxy: Math.round(roiProxy * 100) / 100,
        },
        { onConflict: "campaign_id,day" }
      );

    return { impressions, clicks, leads, ctr, cpl, spend };
  } catch (err) {
    console.error("[boost-analytics] aggregation failed:", err);
    return null;
  }
}

/** Aggregate analytics for all active campaigns */
export async function aggregateAllActiveCampaigns() {
  const { data: campaigns } = await db
    .from("boost_campaigns")
    .select("id")
    .eq("status", "active");

  if (!campaigns?.length) return [];

  const results = await Promise.allSettled(
    campaigns.map((c: any) => aggregateBoostAnalyticsDaily(c.id))
  );

  return results.map((r, i) => ({
    campaignId: campaigns[i].id,
    status: r.status,
    data: r.status === "fulfilled" ? r.value : null,
  }));
}
