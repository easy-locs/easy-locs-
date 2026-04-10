/**
 * auto-acquisition-engine — Discovers, creates ghost listings, and manages merchant claims.
 */
import { supabase } from "@/integrations/supabase/client";
import { eventBus } from "@/lib/core/event-bus";

export interface DiscoveredMerchant {
  id: string;
  name: string;
  category: string | null;
  city: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  logo_url: string | null;
  cover_url: string | null;
  rating: number | null;
  quality_score: number | null;
  visibility_mode: string | null;
  claim_status: string | null;
}

/** Fetch ghost/unclaimed listings for a city */
export async function fetchGhostListings(city?: string, limit = 20): Promise<DiscoveredMerchant[]> {
  let query = supabase
    .from("auto_discovered_merchants")
    .select("id, name, category, city, country, latitude, longitude, logo_url, cover_url, rating, quality_score, visibility_mode, claim_status")
    .eq("visibility_mode", "ghost")
    .eq("claim_status", "unclaimed")
    .order("quality_score", { ascending: false })
    .limit(limit);

  if (city) query = query.ilike("city", `%${city}%`);

  const { data, error } = await query;
  if (error) {
    console.error("[AutoAcquisition] fetch error:", error.message);
    return [];
  }
  return (data ?? []) as DiscoveredMerchant[];
}

/** Claim a ghost listing */
export async function claimMerchant(merchantId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from("auto_discovered_merchants")
    .update({
      claim_status: "claimed",
      claimed_by: userId,
      claimed_at: new Date().toISOString(),
      visibility_mode: "live",
    })
    .eq("id", merchantId)
    .eq("claim_status", "unclaimed");

  if (error) {
    console.error("[AutoAcquisition] claim error:", error.message);
    return false;
  }

  eventBus.emit("merchant.claimed", { merchantId, userId });
  return true;
}

/** Smart targeting: get high-demand areas with few merchants */
export async function getOpportunityZones(): Promise<{ city: string; country: string; count: number }[]> {
  const { data } = await supabase
    .from("auto_discovered_merchants")
    .select("city, country")
    .eq("claim_status", "unclaimed");

  if (!data?.length) return [];

  const counts: Record<string, { city: string; country: string; count: number }> = {};
  data.forEach((d: any) => {
    const key = `${d.city}-${d.country}`;
    if (!counts[key]) counts[key] = { city: d.city, country: d.country, count: 0 };
    counts[key].count++;
  });

  return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
}
