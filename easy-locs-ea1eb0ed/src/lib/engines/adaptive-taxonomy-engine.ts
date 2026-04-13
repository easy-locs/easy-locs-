import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface TaxonomyResult {
  shopId: string;
  shopName: string;
  currentCategory: string | null;
  suggestedCategory: string | null;
  confidence: number;
  reason: string;
  applied: boolean;
}

const VERTICAL_CATEGORIES: Record<string, string[]> = {
  food: ["restaurant", "cafe", "bakery", "fast_food", "fine_dining", "food_truck", "bar", "pizzeria"],
  grocery: ["supermarket", "minimarket", "organic", "butcher", "fishmonger", "specialty"],
  services: ["beauty", "repair", "cleaning", "health", "education", "consulting", "legal", "fitness"],
  hotel: ["hotel", "hostel", "guesthouse", "resort", "apartment", "villa"],
  property: ["residential", "commercial", "industrial", "land", "office"],
};

const KEYWORD_MAP: Record<string, string[]> = {
  restaurant: ["restaurant", "grill", "bistro", "brasserie", "traiteur"],
  cafe: ["cafe", "café", "coffee", "thé", "tea"],
  bakery: ["boulangerie", "bakery", "pâtisserie", "pastry"],
  fast_food: ["fast food", "burger", "pizza", "kebab", "snack", "tacos"],
  supermarket: ["supermarché", "supermarket", "hypermarché", "carrefour"],
  beauty: ["salon", "coiffure", "beauty", "spa", "nail", "barber"],
  repair: ["repair", "réparation", "garage", "auto", "mécanique"],
  cleaning: ["cleaning", "nettoyage", "pressing", "laundry", "laverie"],
  hotel: ["hotel", "hôtel", "lodge", "inn"],
};

const AUTO_APPLY_CONFIDENCE_THRESHOLD = 50;

export async function runAdaptiveTaxonomy(batchSize = 100) {
  return runAdaptiveTaxonomyEngine(batchSize);
}

export async function runAdaptiveTaxonomyEngine(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, vertical, category, subcategory, description")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], mapped: 0 };
  }

  const results: TaxonomyResult[] = [];
  let mapped = 0;

  for (const m of merchants) {
    const v = m.vertical ?? "default";
    const validCats = VERTICAL_CATEGORIES[v] ?? [];

    if (m.category && validCats.includes(m.category)) {
      continue;
    }

    const searchText = `${m.name ?? ""} ${m.description ?? ""}`.toLowerCase();
    let bestMatch: string | null = null;
    let bestScore = 0;

    for (const [cat, keywords] of Object.entries(KEYWORD_MAP)) {
      if (validCats.length > 0 && !validCats.includes(cat)) continue;

      for (const kw of keywords) {
        if (searchText.includes(kw)) {
          const score = kw.length / searchText.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = cat;
          }
        }
      }
    }

    const confidence = Math.min(100, Math.round(bestScore * 1000));

    if (bestMatch) {
      let applied = false;

      if (confidence >= AUTO_APPLY_CONFIDENCE_THRESHOLD) {
        try {
          const { error } = await db
            .from("seed_merchants")
            .update({ category: bestMatch })
            .eq("id", m.id);
          applied = !error;
        } catch {
          applied = false;
        }
      }

      results.push({
        shopId: m.id,
        shopName: m.name ?? "",
        currentCategory: m.category ?? null,
        suggestedCategory: bestMatch,
        confidence,
        reason: "keyword_match",
        applied,
      });
      mapped++;
    } else if (!m.category) {
      results.push({
        shopId: m.id,
        shopName: m.name ?? "",
        currentCategory: null,
        suggestedCategory: null,
        confidence: 0,
        reason: "no_match_found",
        applied: false,
      });
    }
  }

  if (mapped > 0) {
    platformBus.emit("ENTITY_CLASSIFIED", { mapped, total: results.length }, "engine");
  }

  return { status: "completed", results, mapped };
}
