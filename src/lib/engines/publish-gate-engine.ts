/**
 * Publish Gate Engine — Hard gate preventing shops from becoming visible
 * without meeting minimum quality requirements.
 *
 * Requirements for visibility:
 * - Valid category (not null/general/other/unknown)
 * - Valid subcategory
 * - Cover image present
 * - Coherent menu (not generic/duplicate-heavy)
 * - Minimum trust/completeness score >= 40
 */
import { supabase } from "@/integrations/supabase/client";
import { computeMerchantQualityScore, extractMenuItems, isInvalidCategory, isPlaceholderImage } from "./merchant-quality-helpers";

const db = supabase as any;

const GENERIC_MENU_NAMES = ["item 1", "item 2", "menu item", "product", "test", "sample", "example", "placeholder"];

export interface PublishGateResult {
  entityId: string;
  passed: boolean;
  blockers: string[];
}

export interface PublishGateBatchResult {
  checked: number;
  passed: number;
  blocked: number;
  promoted: number;
  results: PublishGateResult[];
}

function checkCategory(category?: string | null, subcategory?: string | null): string[] {
  const blockers: string[] = [];
  if (isInvalidCategory(category)) {
    blockers.push("missing_or_invalid_category");
  }
  if (isInvalidCategory(subcategory)) {
    blockers.push("missing_or_invalid_subcategory");
  }
  return blockers;
}

function checkCover(coverImage?: string | null): string[] {
  if (!coverImage || coverImage.trim().length < 5) return ["missing_cover_image"];
  if (isPlaceholderImage(coverImage)) return ["placeholder_cover_image"];
  return [];
}

function checkMenu(menuJson: any, vertical?: string | null): string[] {
  const blockers: string[] = [];
  if (vertical && vertical !== "food") return blockers;
  if (!menuJson) return ["no_menu_data"];

  const flat = extractMenuItems(menuJson);
  if (flat.length === 0) return ["empty_menu"];
  if (flat.length < 3) blockers.push("too_few_menu_items");

  const names = flat.map((i: any) => (i.name || "").toLowerCase().trim()).filter(Boolean);
  const genericCount = names.filter(n => GENERIC_MENU_NAMES.some(g => n.includes(g))).length;
  if (genericCount > names.length * 0.3) blockers.push("mostly_generic_menu");

  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length * 0.7) blockers.push("mostly_duplicate_menu");

  return blockers;
}

function checkScore(score?: number | null): string[] {
  if (score == null) return ["no_quality_score"];
  if (score < 50) return [`low_quality_score(${score})`];
  return [];
}

/** Run publish gate on a single entity */
export function evaluatePublishGate(entity: {
  id: string;
  category?: string | null;
  subcategory?: string | null;
  cover_image?: string | null;
  menu_items_json?: any;
  vertical?: string | null;
  overall_quality_score?: number | null;
  latitude?: number | null;
  longitude?: number | null;
  phone?: string | null;
  support_phone?: string | null;
  visibility_score?: number | null;
}): PublishGateResult {
  const computedScore = computeMerchantQualityScore(entity);
  const effectiveScore = entity.overall_quality_score ?? Math.max(entity.visibility_score ?? 0, computedScore);
  const blockers = [
    ...checkCategory(entity.category, entity.subcategory),
    ...checkCover(entity.cover_image),
    ...checkMenu(entity.menu_items_json, entity.vertical),
    ...checkScore(effectiveScore),
  ];
  return { entityId: entity.id, passed: blockers.length === 0, blockers };
}

/** Batch: enforce publish gate on all seeds not yet gated */
export async function runPublishGateSweep(limit = 200): Promise<PublishGateBatchResult> {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, vertical, category, subcategory, cover_image, menu_items_json, overall_quality_score, visibility_score, latitude, longitude, phone, support_phone, visibility_mode")
    .limit(limit);

  if (!merchants?.length) return { checked: 0, passed: 0, blocked: 0, promoted: 0, results: [] };

  const results: PublishGateResult[] = [];
  let passed = 0, blocked = 0, promoted = 0;

  for (const m of merchants) {
    const gate = evaluatePublishGate(m);
    results.push(gate);

    if (gate.passed) {
      passed++;
      // Promote to search_only if currently hidden and no blocking_reason
      if (m.visibility_mode === "hidden") {
        await db.from("seed_merchants")
          .update({ visibility_mode: "search_only", blocking_reason: null })
          .eq("id", m.id);
        promoted++;
      }
    } else {
      blocked++;
      // Ensure failing shops are hidden
      if (m.visibility_mode !== "hidden") {
        await db.from("seed_merchants")
          .update({ visibility_mode: "hidden", blocking_reason: `Publish gate: ${gate.blockers.join(", ")}` })
          .eq("id", m.id);
      }
    }
  }

  console.log(`[publish-gate] checked=${merchants.length} passed=${passed} blocked=${blocked} promoted=${promoted}`);
  return { checked: merchants.length, passed, blocked, promoted, results };
}
