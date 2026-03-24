/**
 * User AI Profile Tracker — updates user preferences from behavior events.
 */
import { supabase } from "@/integrations/supabase/client";

export async function trackUserBehavior(input: {
  userId?: string;
  category?: string;
  location?: string;
  priceRange?: string;
  action: string;
}) {
  if (!input.userId) return;

  try {
    // Fetch existing profile
    const { data: existing } = await (supabase as any)
      .from("user_ai_profiles")
      .select("preferred_categories, preferred_locations, activity_score, engagement_score")
      .eq("user_id", input.userId)
      .maybeSingle();

    const cats: string[] = existing?.preferred_categories || [];
    const locs: string[] = existing?.preferred_locations || [];

    if (input.category && !cats.includes(input.category)) {
      cats.push(input.category);
      if (cats.length > 20) cats.shift();
    }
    if (input.location && !locs.includes(input.location)) {
      locs.push(input.location);
      if (locs.length > 10) locs.shift();
    }

    const activityDelta = input.action === "purchase" ? 5 : input.action === "click" ? 1 : 0.5;
    const engagementDelta = input.action === "purchase" ? 10 : input.action === "click" ? 2 : 1;

    await (supabase as any)
      .from("user_ai_profiles")
      .upsert({
        user_id: input.userId,
        preferred_categories: cats,
        preferred_locations: locs,
        preferred_price_range: input.priceRange || existing?.preferred_price_range || null,
        activity_score: (existing?.activity_score || 0) + activityDelta,
        engagement_score: (existing?.engagement_score || 0) + engagementDelta,
        last_active_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
  } catch (err) {
    console.error("[user-ai] track error:", err);
  }
}

export async function getPersonalizedFeed(userId: string) {
  try {
    const { data: profile } = await (supabase as any)
      .from("user_ai_profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();

    if (!profile?.preferred_categories?.length) return [];

    const { data: shops } = await (supabase as any)
      .from("seed_merchants")
      .select("id, name, subcategory, category, city, cover_image, logo_image, rating, visibility_mode")
      .neq("visibility_mode", "hidden")
      .in("subcategory", profile.preferred_categories)
      .limit(50);

    return shops || [];
  } catch (err) {
    console.error("[user-ai] feed error:", err);
    return [];
  }
}
