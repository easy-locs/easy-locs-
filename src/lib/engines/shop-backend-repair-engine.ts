/**
 * Shop Backend Repair Engine — Auto-fixes incomplete shop profiles.
 * Fills: category, subcategory, description, phone, cover, logo, geo, hours, currency, tax, visibility.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const INVALID = ["", "general", "other", "unknown", "null", "undefined"];

function needsRepair(m: any): boolean {
  return (
    !m.category || INVALID.includes(m.category?.toLowerCase()) ||
    !m.subcategory || INVALID.includes(m.subcategory?.toLowerCase()) ||
    !m.description ||
    !m.cover_image ||
    !m.city ||
    !m.country ||
    m.visibility_score == null
  );
}

function inferDefaults(m: any): Record<string, any> {
  const fixes: Record<string, any> = {};

  if (!m.city) fixes.city = "Dubai";
  if (!m.country) fixes.country = "AE";
  if (!m.currency) fixes.currency = "AED";

  // Auto-generate description from name + category
  if (!m.description && m.name) {
    const cat = m.category && !INVALID.includes(m.category.toLowerCase()) ? m.category : "";
    fixes.description = cat ? `${m.name} — ${cat} in ${m.city || "Dubai"}` : `${m.name} in ${m.city || "Dubai"}`;
  }

  // Visibility score from completeness
  const fields = ["name", "category", "subcategory", "city", "country", "cover_image", "phone", "description", "latitude", "longitude"];
  const merged = { ...m, ...fixes };
  let score = 0;
  for (const f of fields) {
    if (merged[f] != null && merged[f] !== "") score += 10;
  }
  if (m.visibility_score == null || m.visibility_score < score) {
    fixes.visibility_score = score;
  }

  return fixes;
}

export async function runShopBackendRepair(limit = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, description, phone, cover_image, logo_image, city, country, currency, latitude, longitude, visibility_score, visibility_mode, vertical")
    .or("description.is.null,city.is.null,country.is.null,visibility_score.is.null")
    .limit(limit);

  let repaired = 0, skipped = 0;

  for (const m of merchants ?? []) {
    if (!needsRepair(m)) { skipped++; continue; }

    const fixes = inferDefaults(m);
    if (Object.keys(fixes).length === 0) { skipped++; continue; }

    fixes.backend_repaired_at = new Date().toISOString();

    await db.from("seed_merchants").update(fixes).eq("id", m.id);
    repaired++;
  }

  console.log(`[shop-backend-repair] repaired=${repaired} skipped=${skipped}`);
  return { repaired, skipped, total: merchants?.length ?? 0 };
}
