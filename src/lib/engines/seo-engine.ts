/**
 * SEO Engine — Ensures all public entities have proper SEO metadata.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runSeoCheck(limit = 100) {
  const { data: shops } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, description, cover_image, seo_status, visibility_mode, overall_quality_score, visibility_score")
    .is("seo_status", null)
    .in("visibility_mode", ["live", "search_only"])
    .limit(limit);

  let checked = 0, optimized = 0, issues = 0;
  for (const shop of shops ?? []) {
    checked++;
    const problems: string[] = [];
    const effectiveScore = shop.overall_quality_score ?? shop.visibility_score ?? 0;

    if (!shop.name || shop.name.length < 3) problems.push("name_too_short");
    if (!shop.description || shop.description.length < 20) problems.push("no_description");
    if (!shop.category) problems.push("no_category");
    if (!shop.cover_image) problems.push("no_cover");
    if (effectiveScore < 50) problems.push("quality_below_threshold");

    const status = problems.length === 0 ? "optimized" : "needs_work";
    await db.from("seed_merchants").update({
      seo_status: status,
      seo_issues: problems,
    }).eq("id", shop.id);

    if (status === "optimized") optimized++;
    else issues++;
  }

  return { checked, optimized, issues };
}
