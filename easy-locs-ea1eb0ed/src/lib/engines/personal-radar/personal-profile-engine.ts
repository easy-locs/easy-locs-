/**
 * Personal Profile Engine — Builds & maintains user radar profile from behavior signals.
 */
import { supabase } from "@/integrations/supabase/client";

export interface UserRadarProfile {
  lifestyleTags: string[];
  budgetProfile: "budget" | "mid" | "premium" | "luxury" | "mixed";
  travelProfile: "local" | "tourist" | "business" | "nomad";
  preferredVerticals: string[];
  preferredCategories: string[];
  tasteScores: Record<string, number>;
}

const DEFAULT_PROFILE: UserRadarProfile = {
  lifestyleTags: [],
  budgetProfile: "mid",
  travelProfile: "local",
  preferredVerticals: [],
  preferredCategories: [],
  tasteScores: {},
};

/** Load or create user radar profile */
export async function loadRadarProfile(userId: string): Promise<UserRadarProfile> {
  const { data } = await supabase
    .from("user_radar_profiles")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (!data) return DEFAULT_PROFILE;

  return {
    lifestyleTags: (data as any).lifestyle_tags || [],
    budgetProfile: (data as any).budget_profile || "mid",
    travelProfile: (data as any).travel_profile || "local",
    preferredVerticals: (data as any).preferred_verticals || [],
    preferredCategories: (data as any).preferred_categories || [],
    tasteScores: (data as any).taste_scores_json || {},
  };
}

/** Update profile from accumulated events */
export async function refreshRadarProfile(userId: string): Promise<UserRadarProfile> {
  // Get recent events (last 30 days)
  const since = new Date(Date.now() - 30 * 86400000).toISOString();
  const { data: events } = await supabase
    .from("user_radar_events")
    .select("event_type, category, subcategory, context")
    .eq("user_id", userId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(500);

  if (!events?.length) return DEFAULT_PROFILE;

  // Count category interactions
  const catCounts: Record<string, number> = {};
  const subCounts: Record<string, number> = {};
  const contextCounts: Record<string, number> = {};
  const weights: Record<string, number> = { click: 1, view: 0.5, order: 3, bookmark: 2, search: 0.8, direction: 1.5 };

  for (const e of events as any[]) {
    const w = weights[e.event_type] || 1;
    if (e.category) catCounts[e.category] = (catCounts[e.category] || 0) + w;
    if (e.subcategory) subCounts[e.subcategory] = (subCounts[e.subcategory] || 0) + w;
    if (e.context) contextCounts[e.context] = (contextCounts[e.context] || 0) + 1;
  }

  const sorted = (c: Record<string, number>) =>
    Object.entries(c).sort((a, b) => b[1] - a[1]).map(([k]) => k);

  const topCats = sorted(catCounts).slice(0, 10);
  const topSubs = sorted(subCounts).slice(0, 15);

  // Infer budget from categories
  const luxSignals = ["luxury", "fine_dining", "premium", "resort", "spa"];
  const budgetSignals = ["fast_food", "budget", "street_food"];
  const luxScore = topCats.filter(c => luxSignals.some(s => c.includes(s))).length;
  const budScore = topCats.filter(c => budgetSignals.some(s => c.includes(s))).length;
  const budgetProfile: string = luxScore > budScore ? "premium" : budScore > luxScore ? "budget" : "mid";

  // Infer travel profile
  const travelSignals = Object.entries(contextCounts);
  const hasAirport = travelSignals.some(([k]) => k.includes("airport"));
  const hasHotel = travelSignals.some(([k]) => k.includes("hotel"));
  const travelProfile = hasAirport || hasHotel ? "tourist" : "local";

  // Build taste scores
  const maxCount = Math.max(...Object.values(catCounts), 1);
  const tasteScores: Record<string, number> = {};
  for (const [k, v] of Object.entries(catCounts)) {
    tasteScores[k] = Math.round((v / maxCount) * 100);
  }

  // Infer lifestyle tags
  const lifestyleTags: string[] = [];
  if (tasteScores["nightlife"] > 30) lifestyleTags.push("nightlife");
  if (tasteScores["cafe"] > 30 || tasteScores["coffee"] > 30) lifestyleTags.push("coffee_lover");
  if (tasteScores["restaurant"] > 40) lifestyleTags.push("foodie");
  if (budgetProfile === "premium" || budgetProfile === "luxury") lifestyleTags.push("premium");
  if (travelProfile === "tourist") lifestyleTags.push("traveler");

  const profile: UserRadarProfile = {
    lifestyleTags,
    budgetProfile: budgetProfile as any,
    travelProfile: travelProfile as any,
    preferredVerticals: topCats.slice(0, 5),
    preferredCategories: topSubs,
    tasteScores,
  };

  // Persist
  await supabase.from("user_radar_profiles").upsert({
    user_id: userId,
    lifestyle_tags: lifestyleTags,
    budget_profile: budgetProfile,
    travel_profile: travelProfile,
    preferred_verticals: topCats.slice(0, 5),
    preferred_categories: topSubs,
    taste_scores_json: tasteScores,
    last_updated_at: new Date().toISOString(),
  } as any, { onConflict: "user_id" });

  return profile;
}

/** Track a radar event */
export async function trackRadarEvent(
  userId: string,
  eventType: string,
  opts?: { entityId?: string; category?: string; subcategory?: string; context?: string; zoneId?: string }
) {
  await supabase.from("user_radar_events").insert({
    user_id: userId,
    event_type: eventType,
    entity_id: opts?.entityId,
    category: opts?.category,
    subcategory: opts?.subcategory,
    context: opts?.context,
    zone_id: opts?.zoneId,
  } as any);
}
