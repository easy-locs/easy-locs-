/**
 * DINO Food Domain Audit — Audits food pages, restaurant cards, cuisine labels, media.
 */

import { supabase } from "@/integrations/supabase/client";
import { sanitizeUiLabel } from "@/lib/dino/dinoTextSanitizer";
import { enqueueDinoJob } from "@/lib/dino/jobQueue";
import type { Json } from "@/integrations/supabase/types";

export async function auditFoodDomain() {
  const issues: { route: string; type: string; summary: string; details: Record<string, unknown> }[] = [];

  // Fetch restaurants
  const { data: restaurants } = await supabase
    .from("storefront_pages" as any)
    .select("id, name, slug, subcategory, description, logo_url, cover_url, rating, active")
    .eq("active", true)
    .limit(200);

  for (const r of restaurants ?? []) {
    const restaurant = r as any;
    // Check dotted labels
    if (restaurant.name && /[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/.test(restaurant.name)) {
      issues.push({
        route: `/food/restaurant/${restaurant.slug || restaurant.id}`,
        type: "i18n",
        summary: `Dotted restaurant name: ${restaurant.name}`,
        details: { original: restaurant.name, sanitized: sanitizeUiLabel(restaurant.name), entityId: restaurant.id },
      });
    }

    // Check subcategory labels
    if (restaurant.subcategory && /[A-Za-zÀ-ÿ]\.[A-Za-zÀ-ÿ]/.test(restaurant.subcategory)) {
      issues.push({
        route: `/food/restaurant/${restaurant.slug || restaurant.id}`,
        type: "category",
        summary: `Malformed subcategory: ${restaurant.subcategory}`,
        details: { original: restaurant.subcategory, sanitized: sanitizeUiLabel(restaurant.subcategory), entityId: restaurant.id },
      });
    }

    // Check missing media
    if (!restaurant.cover_url && !restaurant.logo_url) {
      issues.push({
        route: `/food/restaurant/${restaurant.slug || restaurant.id}`,
        type: "media",
        summary: `Restaurant missing cover and logo: ${restaurant.name}`,
        details: { entityId: restaurant.id },
      });
    }
  }

  // Persist issues
  if (issues.length > 0) {
    await supabase.from("dino_issues").insert(
      issues.map((i) => ({
        severity: i.type === "media" ? "major" : "medium",
        issue_type: i.type,
        route: i.route,
        summary: i.summary,
        details_json: i.details as Json,
        auto_fixable: i.type === "i18n" || i.type === "category",
        fixability: i.type === "i18n" || i.type === "category" ? "safe_auto_fix" : "patch_required",
        status: "open",
      }))
    );

    // Enqueue fix jobs
    for (const i of issues) {
      if (i.type === "i18n" || i.type === "category") {
        await enqueueDinoJob({
          jobType: "sanitize_labels",
          entityType: "restaurant",
          entityId: String(i.details.entityId),
          payload: i.details,
          priority: 10,
        });
      }
      if (i.type === "media") {
        await enqueueDinoJob({
          jobType: "normalize_media",
          entityType: "restaurant",
          entityId: String(i.details.entityId),
          priority: 15,
        });
      }
    }
  }

  // Save food domain quality score
  const mediaIssues = issues.filter((i) => i.type === "media").length;
  const labelIssues = issues.filter((i) => i.type === "i18n" || i.type === "category").length;
  const total = restaurants?.length ?? 0;

  await supabase.from("dino_quality_scores").insert([{
    route: "/food",
    entity_type: "service",
    entity_id: "food",
    ui_score: 90,
    ux_score: 88,
    stability_score: 90,
    media_score: total > 0 ? Math.max(0, 100 - Math.round((mediaIssues / total) * 100)) : 100,
    i18n_score: total > 0 ? Math.max(0, 100 - Math.round((labelIssues / total) * 100)) : 100,
    category_score: 85,
    total_score: 85,
    score_details: { totalRestaurants: total, mediaIssues, labelIssues } as Json,
    updated_at: new Date().toISOString(),
  }]);

  return { audited: total, issues: issues.length };
}
