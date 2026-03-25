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

const db = supabase as any;

const INVALID_CATEGORIES = ["general", "other", "unknown", "", null, undefined];
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
  if (!category || INVALID_CATEGORIES.includes(category.toLowerCase())) {
    blockers.push("missing_or_invalid_category");
  }
  if (!subcategory || INVALID_CATEGORIES.includes(subcategory.toLowerCase())) {
    blockers.push("missing_or_invalid_subcategory");
  }
  return blockers;
}

function checkCover(coverImage?: string | null): string[] {
  if (!coverImage || coverImage.trim().length < 5) return ["missing_cover_image"];
  return [];
}

function checkMenu(menuJson: any): string[] {
  const blockers: string[] = [];
  if (!menuJson) return ["no_menu_data"];
  
  const items = Array.isArray(menuJson) ? menuJson : menuJson.items || menuJson.sections || [];
  const flat = Array.isArray(items) ? items.flatMap((s: any) => s.items || [s]) : [];
  if (flat.length === 0) return ["empty_menu"];

  const names = flat.map((i: any) => (i.name || "").toLowerCase().trim()).filter(Boolean);
  const genericCount = names.filter(n => GENERIC_MENU_NAMES.some(g => n.includes(g))).length;
  if (genericCount > names.length * 0.5) blockers.push("mostly_generic_menu");

  const uniqueNames = new Set(names);
  if (uniqueNames.size < names.length * 0.5) blockers.push("mostly_duplicate_menu");

  return blockers;
}

function checkScore(score?: number | null): string[] {
  if (score == null) return ["no_quality_score"];
  if (score < 40) return [`low_quality_score(${score})`];
  return [];
}

/** Run publish gate on a single entity */
export function evaluatePublishGate(entity: {
  id: string;
  category?: string | null;
  subcategory?: string | null;
  cover_image?: string | null;
  menu_items_json?: any;
  visibility_score?: number | null;
}): PublishGateResult {
  const blockers = [
    ...checkCategory(entity.category, entity.subcategory),
    ...checkCover(entity.cover_image),
    ...checkMenu(entity.menu_items_json),
    ...checkScore(entity.visibility_score),
  ];
  return { entityId: entity.id, passed: blockers.length === 0, blockers };
}

/** Batch: enforce publish gate on all seeds not yet gated */
export async function runPublishGateSweep(limit = 200): Promise<PublishGateBatchResult> {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, cover_image, menu_items_json, visibility_score, visibility_mode")
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
