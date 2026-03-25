/**
 * Onboarding Correction Loop — Post-import pipeline that ensures
 * every imported entity goes through: enrich → deduplicate → reclassify → rescore → gate.
 * Only publishes if quality threshold is met.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

export interface CorrectionReport {
  processed: number;
  enriched: number;
  deduped: number;
  reclassified: number;
  rescored: number;
  promoted: number;
  blocked: number;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  restaurant: ["restaurant", "food", "cuisine", "kitchen", "diner", "bistro", "grill", "café", "cafe"],
  coffee: ["coffee", "café", "cafe", "espresso", "latte", "brew"],
  bakery: ["bakery", "patisserie", "pastry", "cake", "bread", "boulangerie"],
  pharmacy: ["pharmacy", "pharma", "medical", "drug", "health"],
  grocery: ["grocery", "supermarket", "mart", "market", "store"],
  salon: ["salon", "barber", "beauty", "hair", "spa", "nails"],
  gym: ["gym", "fitness", "sport", "training", "workout"],
};

/** Attempt to reclassify based on name/description keywords */
function inferCategory(name: string, description?: string): { category: string; subcategory: string } | null {
  const text = `${name} ${description ?? ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(k => text.includes(k))) {
      return { category: cat, subcategory: cat };
    }
  }
  return null;
}

/** Simple completeness score */
function computeCompleteness(m: any): number {
  let score = 0;
  const fields = ["name", "category", "subcategory", "city", "country", "cover_image", "phone", "latitude", "longitude"];
  for (const f of fields) {
    if (m[f] != null && m[f] !== "") score += 1;
  }
  // Menu bonus
  if (m.menu_items_json && (Array.isArray(m.menu_items_json) ? m.menu_items_json.length > 0 : true)) score += 1;
  return Math.round((score / 10) * 100);
}

/** Detect likely duplicates by exact name + city */
async function findDuplicates(name: string, city: string, excludeId: string): Promise<string[]> {
  if (!name || !city) return [];
  const { data } = await db
    .from("seed_merchants")
    .select("id")
    .ilike("name", name)
    .eq("city", city)
    .neq("id", excludeId)
    .limit(5);
  return (data ?? []).map((d: any) => d.id);
}

export async function runOnboardingCorrectionLoop(limit = 100): Promise<CorrectionReport> {
  const report: CorrectionReport = {
    processed: 0, enriched: 0, deduped: 0, reclassified: 0, rescored: 0, promoted: 0, blocked: 0,
  };

  // Target: merchants with no visibility_score or low score, not yet corrected
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, description, category, subcategory, city, country, cover_image, phone, latitude, longitude, menu_items_json, visibility_score, visibility_mode")
    .or("visibility_score.is.null,visibility_score.lt.40")
    .limit(limit);

  if (!merchants?.length) return report;

  for (const m of merchants) {
    report.processed++;
    const updates: Record<string, any> = {};

    // 1. Enrich: fill missing city/country
    if (!m.city) { updates.city = "Dubai"; report.enriched++; }
    if (!m.country) { updates.country = "AE"; report.enriched++; }

    // 2. Deduplicate check
    const dupes = await findDuplicates(m.name, m.city || "Dubai", m.id);
    if (dupes.length > 0) {
      updates.visibility_mode = "hidden";
      updates.blocking_reason = `Possible duplicate of ${dupes[0]}`;
      report.deduped++;
    }

    // 3. Reclassify if category is missing or generic
    if (!m.category || m.category === "general" || m.category === "other") {
      const inferred = inferCategory(m.name, m.description);
      if (inferred) {
        updates.category = inferred.category;
        updates.subcategory = inferred.subcategory;
        report.reclassified++;
      }
    }

    // 4. Rescore
    const merged = { ...m, ...updates };
    const newScore = computeCompleteness(merged);
    updates.visibility_score = newScore;
    report.rescored++;

    // 5. Gate: promote or block
    if (dupes.length === 0) {
      if (newScore >= 50 && merged.category && merged.cover_image) {
        updates.visibility_mode = "search_only";
        updates.blocking_reason = null;
        report.promoted++;
      } else if (newScore < 30) {
        updates.visibility_mode = "hidden";
        updates.blocking_reason = `Low quality score: ${newScore}`;
        report.blocked++;
      }
    }

    // Apply updates
    if (Object.keys(updates).length > 0) {
      await db.from("seed_merchants").update(updates).eq("id", m.id);
    }
  }

  console.log(`[onboarding-correction] processed=${report.processed} enriched=${report.enriched} deduped=${report.deduped} reclassified=${report.reclassified} promoted=${report.promoted} blocked=${report.blocked}`);
  return report;
}
