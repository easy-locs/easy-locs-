/**
 * Data Trust Engine — Scans and scores merchant data quality.
 * Detects fake menus, bad images, wrong categories, and computes trust scores.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "menu item", "product", "test", "sample", "example", "placeholder"];
const INCOHERENT_COMBOS: Record<string, string[]> = {
  sushi: ["pizza", "burger", "shawarma", "fried chicken"],
  pizza: ["sushi", "sashimi", "maki", "nigiri"],
  burger: ["sushi", "maki", "dim sum"],
  indian: ["sushi", "pizza"],
};

export interface TrustReport {
  entityId: string;
  menuScore: number;
  imageScore: number;
  completenessScore: number;
  categoryCoherence: number;
  trustScore: number;
  flags: string[];
}

function scoreMenu(menuJson: any, category?: string): { score: number; flags: string[] } {
  const flags: string[] = [];
  if (!menuJson || (Array.isArray(menuJson) && menuJson.length === 0)) {
    return { score: 0, flags: ["empty_menu"] };
  }

  const items = Array.isArray(menuJson) ? menuJson : menuJson.items || menuJson.sections || [];
  const flat = Array.isArray(items) ? items.flatMap((s: any) => s.items || [s]) : [];

  if (flat.length === 0) return { score: 10, flags: ["no_menu_items"] };

  // Detect generic/fake names
  const genericCount = flat.filter((i: any) =>
    GENERIC_NAMES.some(g => (i.name || "").toLowerCase().includes(g))
  ).length;
  if (genericCount > flat.length * 0.3) flags.push("generic_menu_items");

  // Detect duplicates
  const names = flat.map((i: any) => (i.name || "").toLowerCase().trim());
  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length * 0.7) flags.push("duplicate_menu_items");

  // Detect category mismatch
  const cat = (category || "").toLowerCase();
  const allText = names.join(" ");
  for (const [key, badItems] of Object.entries(INCOHERENT_COMBOS)) {
    if (cat.includes(key)) {
      const badCount = badItems.filter(b => allText.includes(b)).length;
      if (badCount > 1) flags.push("category_menu_mismatch");
    }
  }

  let score = 80;
  if (flags.includes("generic_menu_items")) score -= 30;
  if (flags.includes("duplicate_menu_items")) score -= 20;
  if (flags.includes("category_menu_mismatch")) score -= 25;
  if (flat.length < 3) score -= 15;

  return { score: Math.max(0, Math.min(100, score)), flags };
}

function scoreImages(row: any): { score: number; flags: string[] } {
  const flags: string[] = [];
  let score = 50;

  if (row.logo_url) score += 15;
  else flags.push("missing_logo");

  if (row.cover_url || row.cover_image_url) score += 15;
  else flags.push("missing_cover");

  if (row.gallery_urls && Array.isArray(row.gallery_urls) && row.gallery_urls.length > 0) {
    score += 10;
    if (row.gallery_urls.length > 3) score += 10;
  } else {
    flags.push("no_gallery");
  }

  return { score: Math.min(100, score), flags };
}

function scoreCompleteness(row: any): number {
  let filled = 0;
  const fields = ["name", "category", "subcategory", "city", "country", "phone", "latitude", "longitude", "description"];
  for (const f of fields) {
    if (row[f] != null && row[f] !== "") filled++;
  }
  return Math.round((filled / fields.length) * 100);
}

export async function runDataTrustScan(limit = 200): Promise<{ scanned: number; flagged: number; reports: TrustReport[] }> {
  const { data: merchants, error } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, city, country, phone, latitude, longitude, description, logo_url, cover_url, gallery_urls, menu_items_json, cuisine_tags, visibility_score")
    .limit(limit);

  if (error || !merchants) {
    console.error("[data-trust] fetch error", error);
    return { scanned: 0, flagged: 0, reports: [] };
  }

  const reports: TrustReport[] = [];
  let flagged = 0;

  for (const m of merchants) {
    const { score: menuScore, flags: menuFlags } = scoreMenu(m.menu_items_json, m.category);
    const { score: imageScore, flags: imageFlags } = scoreImages(m);
    const completenessScore = scoreCompleteness(m);

    // Category coherence
    let categoryCoherence = 70;
    if (!m.category || m.category === "general" || m.category === "other") {
      categoryCoherence = 30;
    }

    const trustScore = Math.round(
      menuScore * 0.3 +
      imageScore * 0.2 +
      completenessScore * 0.3 +
      categoryCoherence * 0.2
    );

    const allFlags = [...menuFlags, ...imageFlags];
    if (categoryCoherence < 50) allFlags.push("weak_category");
    if (completenessScore < 40) allFlags.push("incomplete_profile");

    if (allFlags.length > 0) flagged++;

    reports.push({
      entityId: m.id,
      menuScore,
      imageScore,
      completenessScore,
      categoryCoherence,
      trustScore,
      flags: allFlags,
    });

    // Update trust score in DB
    await db
      .from("seed_merchants")
      .update({ visibility_score: trustScore })
      .eq("id", m.id);
  }

  console.log(`[data-trust] scanned=${merchants.length} flagged=${flagged}`);
  return { scanned: merchants.length, flagged, reports };
}
