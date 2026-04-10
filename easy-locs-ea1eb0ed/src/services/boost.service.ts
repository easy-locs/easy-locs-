import { db } from "./db";


export const boostService = {
  async fetchCampaigns(userId: string) {
    const { data, error } = await db("boost_campaigns")
      .select("*")
      .eq("owner_user_id", userId)
      .order("created_at", { ascending: false }) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async fetchAnalyticsOverview(campaignIds: string[]) {
    const [impressions, clicks, leads] = await Promise.all([
      db("boost_impressions").select("id", { count: "exact", head: true } as any).in("campaign_id", campaignIds),
      db("boost_clicks").select("id", { count: "exact", head: true } as any).in("campaign_id", campaignIds),
      db("boost_leads").select("id", { count: "exact", head: true } as any).in("campaign_id", campaignIds),
    ]);
    return {
      impressions: (impressions as any).count || 0,
      clicks: (clicks as any).count || 0,
      leads: (leads as any).count || 0,
    };
  },

  async fetchRecentLeads(campaignIds: string[], limit = 20) {
    const { data, error } = await db("boost_leads")
      .select("*")
      .in("campaign_id", campaignIds)
      .order("created_at", { ascending: false })
      .limit(limit) as { data: unknown[] | null; error: unknown };
    if (error) throw error;
    return data ?? [];
  },

  async toggleCampaignStatus(campaignId: string, currentStatus: string) {
    const next = currentStatus === "active" ? "paused" : "active";
    const { error } = await db("boost_campaigns")
      .update({ status: next })
      .eq("id", campaignId);
    if (error) throw error;
  },
};
