/**
 * Publish Gate — SERVICE specific. Validates service catalog, not menu or rooms.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export async function runServicePublishGate(limit = 50) {
  const { data: services } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, cover_image, service_catalog_json, visibility_score, visibility_mode")
    .eq("vertical", "services")
    .limit(limit);

  let passed = 0, blocked = 0, promoted = 0;

  for (const s of services ?? []) {
    const blockers: string[] = [];

    if (!s.category || ["general", "other", "unknown"].includes(s.category?.toLowerCase())) blockers.push("invalid_category");
    if (!s.cover_image) blockers.push("no_cover");
    if ((s.visibility_score ?? 0) < 30) blockers.push("low_score");

    // Service-specific: must have service catalog with at least 1 service
    const catalog = s.service_catalog_json;
    if (!catalog || !catalog.services || catalog.services.length === 0) {
      blockers.push("no_service_catalog");
    }

    if (blockers.length === 0) {
      passed++;
      if (s.visibility_mode === "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "search_only", blocking_reason: null }).eq("id", s.id);
        promoted++;
      }
    } else {
      blocked++;
      if (s.visibility_mode !== "hidden") {
        await db.from("seed_merchants").update({ visibility_mode: "hidden", blocking_reason: `service_gate: ${blockers.join(", ")}` }).eq("id", s.id);
      }
    }
  }

  console.log(`[service-publish-gate] passed=${passed} blocked=${blocked} promoted=${promoted}`);
  return { passed, blocked, promoted };
}
