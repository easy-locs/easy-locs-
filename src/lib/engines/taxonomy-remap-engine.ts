/**
 * Taxonomy Remap Engine — Revalidates and corrects taxonomy after menu rebuild.
 * Ensures vertical/category/subcategory coherence with menu content.
 */
import { supabase } from "@/integrations/supabase/client";
import { validateAndCorrectTaxonomy } from "@/lib/taxonomy/taxonomy-guard";

const db = supabase as any;

const FOOD_SIGNALS: Record<string, { category: string; subcategory: string }> = {
  pizza: { category: "restaurant", subcategory: "pizzeria" },
  burger: { category: "restaurant", subcategory: "burger_joint" },
  sushi: { category: "restaurant", subcategory: "japanese" },
  shawarma: { category: "restaurant", subcategory: "middle_eastern" },
  kebab: { category: "restaurant", subcategory: "middle_eastern" },
  pasta: { category: "restaurant", subcategory: "italian" },
  ramen: { category: "restaurant", subcategory: "japanese" },
  taco: { category: "restaurant", subcategory: "mexican" },
  biryani: { category: "restaurant", subcategory: "indian" },
  croissant: { category: "bakery_pastry", subcategory: "bakery" },
  cake: { category: "bakery_pastry", subcategory: "pastry_shop" },
  donut: { category: "bakery_pastry", subcategory: "pastry_shop" },
  coffee: { category: "cafe_coffee", subcategory: "coffee_shop" },
  smoothie: { category: "cafe_coffee", subcategory: "juice_bar" },
  juice: { category: "cafe_coffee", subcategory: "juice_bar" },
  ice_cream: { category: "bakery_pastry", subcategory: "ice_cream_shop" },
};

const INVALID_CATEGORIES = ["general", "other", "unknown", "uncategorized", "misc", "n/a"];

function inferTaxonomyFromMenu(menuJson: any): { category: string | null; subcategory: string | null } {
  if (!menuJson) return { category: null, subcategory: null };

  const items = Array.isArray(menuJson)
    ? menuJson
    : menuJson?.sections?.flatMap((s: any) => s.items || []) || menuJson?.items || [];

  const signalCounts: Record<string, number> = {};

  for (const item of items) {
    const text = `${item?.name || ""} ${item?.canonical_name || ""} ${item?.category || ""}`.toLowerCase();
    for (const [signal, mapping] of Object.entries(FOOD_SIGNALS)) {
      if (text.includes(signal)) {
        const key = `${mapping.category}|${mapping.subcategory}`;
        signalCounts[key] = (signalCounts[key] || 0) + 1;
      }
    }
  }

  const sorted = Object.entries(signalCounts).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0) return { category: null, subcategory: null };

  const [top] = sorted;
  const [category, subcategory] = top[0].split("|");
  return { category, subcategory };
}

export async function runTaxonomyRemapEngine(limit = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, vertical, category, subcategory, menu_items_json, taxonomy_score, vertical_locked")
    .eq("vertical", "food")
    .limit(limit);

  let remapped = 0, blocked = 0, ok = 0;

  for (const m of merchants ?? []) {
    const issues: string[] = [];
    let newCategory = m.category;
    let newSubcategory = m.subcategory;
    let taxScore = 100;

    // Check vertical lock
    if (!m.vertical_locked) {
      taxScore -= 20;
      issues.push("vertical_not_locked");
    }

    // Check invalid category
    if (!m.category || INVALID_CATEGORIES.includes(m.category?.toLowerCase())) {
      taxScore -= 30;
      issues.push("invalid_category");

      // Try to infer from menu
      const inferred = inferTaxonomyFromMenu(m.menu_items_json);
      if (inferred.category) {
        newCategory = inferred.category;
        newSubcategory = inferred.subcategory;
        issues.push(`inferred: ${inferred.category}/${inferred.subcategory}`);
        taxScore += 15; // Partial recovery
      }
    }

    // Check subcategory
    if (!m.subcategory || INVALID_CATEGORIES.includes(m.subcategory?.toLowerCase())) {
      taxScore -= 20;
      issues.push("missing_subcategory");

      if (!newSubcategory) {
        const inferred = inferTaxonomyFromMenu(m.menu_items_json);
        if (inferred.subcategory) {
          newSubcategory = inferred.subcategory;
          taxScore += 10;
        }
      }
    }

    // Validate with taxonomy guard
    const validation = validateAndCorrectTaxonomy("food", newCategory, newSubcategory);
    if (!validation.valid) {
      taxScore -= 15;
      issues.push(...validation.errors);
    }
    if (validation.corrections.length > 0) {
      newCategory = validation.cluster || newCategory;
      newSubcategory = validation.subcategory || newSubcategory;
    }

    taxScore = Math.max(0, Math.min(100, taxScore));

    const update: Record<string, any> = {
      taxonomy_score: taxScore,
    };

    if (newCategory !== m.category) update.category = newCategory;
    if (newSubcategory !== m.subcategory) update.subcategory = newSubcategory;

    if (taxScore < 30) {
      update.visibility_mode = "hidden";
      update.blocking_reason = `taxonomy_failed: ${issues.join(", ")}`;
      blocked++;
    } else if (issues.length === 0) {
      ok++;
    } else {
      remapped++;
    }

    await db.from("seed_merchants").update(update).eq("id", m.id);
  }

  console.log(`[taxonomy-remap] ok=${ok} remapped=${remapped} blocked=${blocked}`);
  return { ok, remapped, blocked, total: merchants?.length ?? 0 };
}
