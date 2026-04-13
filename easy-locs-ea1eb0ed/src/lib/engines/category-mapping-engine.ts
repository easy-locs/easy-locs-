import { db } from "@/services/db";

interface MappingItem {
  shopId: string;
  shopName: string;
  oldCategory: string | null;
  newCategory: string;
  reason: string;
  persisted: boolean;
}

interface MappingResult {
  status: string;
  results: MappingItem[];
  remapped: number;
}

const CATEGORY_ALIASES: Record<string, string> = {
  "resto": "restaurant",
  "restuarant": "restaurant",
  "restauration": "restaurant",
  "café": "cafe",
  "coffe": "cafe",
  "coffee shop": "cafe",
  "boulangerie": "bakery",
  "patisserie": "bakery",
  "pâtisserie": "bakery",
  "fast-food": "fast_food",
  "fastfood": "fast_food",
  "kebab": "fast_food",
  "snack": "fast_food",
  "supermarché": "supermarket",
  "hypermarché": "supermarket",
  "mini market": "minimarket",
  "mini-market": "minimarket",
  "épicerie": "minimarket",
  "salon de coiffure": "beauty",
  "coiffure": "beauty",
  "barber": "beauty",
  "barbershop": "beauty",
  "hôtel": "hotel",
  "auberge": "guesthouse",
  "pension": "guesthouse",
};

export async function runCategoryMapping(batchSize = 200): Promise<MappingResult> {
  return runCategoryMappingSync(batchSize);
}

export async function runCategoryMappingSync(batchSize = 200): Promise<MappingResult> {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], remapped: 0 };
  }

  const results: MappingItem[] = [];
  let remapped = 0;

  for (const m of merchants) {
    const cat = (m.category ?? "").toLowerCase().trim();
    if (!cat) continue;

    const canonical = CATEGORY_ALIASES[cat];
    if (canonical && canonical !== cat) {
      let persisted = false;
      try {
        const { error } = await db
          .from("seed_merchants")
          .update({ category: canonical })
          .eq("id", m.id);
        persisted = !error;
      } catch {
        persisted = false;
      }

      results.push({
        shopId: m.id,
        shopName: m.name ?? "",
        oldCategory: m.category,
        newCategory: canonical,
        reason: "alias_normalization",
        persisted,
      });
      remapped++;
    }
  }

  return { status: "completed", results, remapped };
}
