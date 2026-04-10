import { heroCover } from "./category-covers";
/**
 * Hero Diversity Guard — prevents duplicate hero images across shops.
 * Used at import time to ensure visual uniqueness.
 */
import { supabase } from "@/integrations/supabase/client";
import { SUBCATEGORY_HERO_MAP } from "./subcategory-heroes";

/**
 * Check how many shops already use a given cover_image URL.
 * Returns the usage count.
 */
export async function getHeroUsageCount(imageUrl: string): Promise<number> {
  const { count, error } = await supabase
    .from("seed_merchants")
    .select("id", { count: "exact", head: true })
    .eq("cover_image", imageUrl);

  if (error) return 0;
  return count ?? 0;
}

/**
 * Pick the least-used hero image for a given subcategory.
 * Guarantees visual diversity by checking current DB usage.
 */
export async function pickDiverseHero(subcategory: string): Promise<string> {
  const candidates = SUBCATEGORY_HERO_MAP[subcategory];
  if (!candidates?.length) {
    // Fallback: generic business image
    return heroCover("services");
  }

  // Check usage of each candidate
  const usageCounts = await Promise.all(
    candidates.map(async (url) => ({
      url,
      count: await getHeroUsageCount(url),
    }))
  );

  // Sort by usage (ascending) and pick the least used
  usageCounts.sort((a, b) => a.count - b.count);
  return usageCounts[0].url;
}

/**
 * Validate that a proposed hero image is not over-used.
 * Returns { ok, suggestedAlternative } 
 */
export async function validateHeroUniqueness(
  imageUrl: string,
  subcategory: string,
  maxAllowed: number = 2
): Promise<{ ok: boolean; suggestedAlternative?: string }> {
  const count = await getHeroUsageCount(imageUrl);
  
  if (count < maxAllowed) {
    return { ok: true };
  }

  // Image is over-used, pick an alternative
  const alternative = await pickDiverseHero(subcategory);
  return { ok: false, suggestedAlternative: alternative };
}
