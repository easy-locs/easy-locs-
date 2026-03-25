/**
 * Strict Quality Gate Engine — NO QUALITY = NO PUBLISH
 * 
 * Pipeline: Scrape → Clean → Validate → Normalize → Score → Gate → Publish
 * 
 * Every entity MUST pass ALL quality checks before visibility.
 * Scores: menu_quality_score, taxonomy_score, data_completeness_score
 */
import { supabase } from "@/integrations/supabase/client";
import { computeMerchantQualityScore, extractMenuItems, isInvalidCategory, isPlaceholderImage } from "./merchant-quality-helpers";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "item 3", "menu item", "product", "test", "sample", "example", "placeholder", "untitled", "new item", "dish", "plat", "n/a", "unnamed"];

interface QualityScores {
  menu_quality_score: number;
  taxonomy_score: number;
  data_completeness_score: number;
  overall_score: number;
}

interface GateResult {
  entityId: string;
  name: string;
  scores: QualityScores;
  blockers: string[];
  action: "publish" | "block" | "unpublish" | "review";
}

function scoreMenu(menuJson: any, vertical: string): { score: number; blockers: string[] } {
  const blockers: string[] = [];
  if (!menuJson) { blockers.push("menu_empty"); return { score: 0, blockers }; }

  const items = extractMenuItems(menuJson);

  if (!Array.isArray(items) || items.length === 0) {
    blockers.push("menu_empty"); return { score: 0, blockers };
  }

  // Min items rule
  const minItems = vertical === "food" ? 3 : 1;
  if (items.length < minItems) blockers.push(`menu_too_few_items(${items.length}<${minItems})`);

  // Generic names
  const names = items.map((i: any) => (i.name || i.item_name || "").toLowerCase().trim()).filter(Boolean);
  const genericCount = names.filter((n: string) => GENERIC_NAMES.some(g => n.includes(g))).length;
  if (genericCount > names.length * 0.3) blockers.push(`menu_generic(${genericCount}/${names.length})`);

  // Duplicates
  const unique = new Set(names);
  const dupRate = 1 - (unique.size / Math.max(names.length, 1));
  if (dupRate > 0.4) blockers.push(`menu_high_duplication(${Math.round(dupRate * 100)}%)`);

  // Price check (food only)
  if (vertical === "food") {
    const withPrice = items.filter((i: any) => {
      const p = parseFloat(i.price);
      return !isNaN(p) && p > 0;
    }).length;
    if (withPrice < items.length * 0.5) blockers.push("menu_no_prices");
  }

  // Incoherent text
  const suspiciousText = names.filter((n: string) => n.length < 2 || /^[0-9]+$/.test(n) || n.includes("http")).length;
  if (suspiciousText > names.length * 0.2) blockers.push("menu_incoherent_text");

  const score = Math.max(0, Math.min(100,
    100
    - (blockers.includes("menu_empty") ? 100 : 0)
    - (genericCount / Math.max(names.length, 1)) * 40
    - dupRate * 30
    - (suspiciousText / Math.max(names.length, 1)) * 20
    - (items.length < minItems ? 20 : 0)
  ));

  return { score: Math.round(score), blockers };
}

function scoreTaxonomy(entity: any): { score: number; blockers: string[] } {
  const blockers: string[] = [];
  let score = 100;

  // Vertical check
  if (!entity.vertical || entity.vertical === "unknown") {
    blockers.push("no_vertical");
    score -= 50;
  }

  // Category check
  if (isInvalidCategory(entity.category)) {
    blockers.push("invalid_category");
    score -= 25;
  }

  // Subcategory
  if (isInvalidCategory(entity.subcategory)) {
    blockers.push("missing_subcategory");
    score -= 15;
  }

  // Vertical lock
  if (!entity.vertical_locked) {
    score -= 10;
  }

  return { score: Math.max(0, score), blockers };
}

function scoreCompleteness(entity: any): { score: number; blockers: string[] } {
  const blockers: string[] = [];
  let score = 0;

  if (!entity.name || entity.name.trim().length < 2) blockers.push("no_name");
  if (!entity.cover_image) blockers.push("no_cover");
  if (entity.cover_image && isPlaceholderImage(entity.cover_image)) blockers.push("placeholder_cover");
  if (!entity.city || !entity.country || entity.latitude == null || entity.longitude == null) blockers.push("imprecise_location");
  if (!(entity.phone || entity.support_phone)) blockers.push("no_phone");
  if (isInvalidCategory(entity.category)) blockers.push("invalid_category");

  if (entity.cover_image && !isPlaceholderImage(entity.cover_image)) score += 20;
  if (!blockers.includes("imprecise_location")) score += 20;
  if (entity.phone || entity.support_phone) score += 20;
  if (!isInvalidCategory(entity.category)) score += 20;

  return { score, blockers };
}

const PUBLISH_THRESHOLD = 50;
const BLOCK_THRESHOLD = 30;

export async function runStrictQualityGate(limit = 200): Promise<{
  processed: number;
  published: number;
  blocked: number;
  unpublished: number;
  review: number;
  results: GateResult[];
}> {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, vertical, vertical_locked, category, subcategory, cover_image, city, country, latitude, longitude, phone, support_phone, menu_items_json, hotel_inventory_json, service_catalog_json, grocery_catalog_json, visibility_score, visibility_mode, pipeline_stage")
    .limit(limit);

  let published = 0, blocked = 0, unpublished = 0, review = 0;
  const results: GateResult[] = [];

  for (const e of entities ?? []) {
    const allBlockers: string[] = [];

    // Score menu based on vertical
    const vertical = (e.vertical || "").toLowerCase();
    let menuScore = { score: 100, blockers: [] as string[] };
    if (vertical === "food") {
      menuScore = scoreMenu(e.menu_items_json, "food");
    } else if (vertical === "hotel") {
      const inv = e.hotel_inventory_json;
      if (!inv || !inv.roomTypes || inv.roomTypes.length === 0) {
        menuScore = { score: 0, blockers: ["no_room_inventory"] };
      }
    } else if (vertical === "grocery") {
      const cat = e.grocery_catalog_json;
      if (!cat || !cat.products || cat.products.length === 0) {
        menuScore = { score: 0, blockers: ["no_grocery_catalog"] };
      }
    } else if (vertical === "services") {
      const cat = e.service_catalog_json;
      if (!cat || !cat.services || cat.services.length === 0) {
        menuScore = { score: 0, blockers: ["no_service_catalog"] };
      }
    } else if (vertical === "food" || !vertical) {
      // Unknown vertical with menu → score it
      menuScore = scoreMenu(e.menu_items_json, "food");
    }

    const taxScore = scoreTaxonomy(e);
    const compScore = scoreCompleteness(e);

    allBlockers.push(...menuScore.blockers, ...taxScore.blockers, ...compScore.blockers);

    const scores: QualityScores = {
      menu_quality_score: menuScore.score,
      taxonomy_score: taxScore.score,
      data_completeness_score: compScore.score,
      overall_score: computeMerchantQualityScore(e),
    };

    // Decision
    let action: GateResult["action"] = "review";
    if (scores.overall_score >= PUBLISH_THRESHOLD && allBlockers.length === 0) {
      action = "publish";
    } else if (scores.overall_score < BLOCK_THRESHOLD || allBlockers.some(b => b.includes("menu_empty") || b.includes("placeholder_cover") || b.includes("invalid_category") || b.includes("no_vertical") || b.includes("no_name"))) {
      action = "block";
    } else if (e.visibility_mode === "live" && scores.overall_score < PUBLISH_THRESHOLD) {
      action = "unpublish";
    }

    // Apply
    const update: Record<string, any> = {
      menu_quality_score: scores.menu_quality_score,
      taxonomy_score: scores.taxonomy_score,
      data_completeness_score: scores.data_completeness_score,
      overall_quality_score: scores.overall_score,
    };

    if (action === "block") {
      if (e.visibility_mode !== "hidden") {
        update.visibility_mode = "hidden";
        update.blocking_reason = `quality_gate: ${allBlockers.slice(0, 5).join(", ")}`;
      }
      blocked++;
    } else if (action === "unpublish") {
      update.visibility_mode = "search_only";
      update.blocking_reason = `quality_downgraded: score=${scores.overall_score}`;
      unpublished++;
    } else if (action === "publish") {
      if (e.visibility_mode === "hidden") {
        update.visibility_mode = "search_only";
        update.blocking_reason = null;
      }
      published++;
    } else {
      review++;
    }

    await db.from("seed_merchants").update(update).eq("id", e.id);

    results.push({ entityId: e.id, name: e.name ?? "?", scores, blockers: allBlockers, action });
  }

  console.log(`[strict-quality-gate] processed=${entities?.length ?? 0} published=${published} blocked=${blocked} unpublished=${unpublished} review=${review}`);
  return { processed: entities?.length ?? 0, published, blocked, unpublished, review, results };
}
