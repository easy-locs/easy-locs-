/**
 * Category Mapping Engine — Maps raw categories to canonical taxonomy per vertical.
 * Food ≠ Hotel. Each vertical has strict category rules.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const FOOD_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  restaurant: { category: "restaurant", subcategory: "restaurant" },
  fast_food: { category: "restaurant", subcategory: "fast_food" },
  pizza: { category: "restaurant", subcategory: "pizza" },
  burger: { category: "restaurant", subcategory: "burger" },
  sushi: { category: "restaurant", subcategory: "sushi" },
  chinese: { category: "restaurant", subcategory: "chinese" },
  indian: { category: "restaurant", subcategory: "indian" },
  mexican: { category: "restaurant", subcategory: "mexican" },
  italian: { category: "restaurant", subcategory: "italian" },
  thai: { category: "restaurant", subcategory: "thai" },
  lebanese: { category: "restaurant", subcategory: "lebanese" },
  arabic: { category: "restaurant", subcategory: "arabic" },
  seafood: { category: "restaurant", subcategory: "seafood" },
  steakhouse: { category: "restaurant", subcategory: "steakhouse" },
  cafe: { category: "cafe", subcategory: "cafe" },
  coffee: { category: "cafe", subcategory: "coffee_shop" },
  bakery: { category: "bakery", subcategory: "bakery" },
  dessert: { category: "bakery", subcategory: "dessert" },
  ice_cream: { category: "bakery", subcategory: "ice_cream" },
  juice: { category: "cafe", subcategory: "juice_bar" },
  healthy: { category: "restaurant", subcategory: "healthy" },
  vegan: { category: "restaurant", subcategory: "vegan" },
};

const HOTEL_CATEGORY_MAP: Record<string, { category: string; subcategory: string }> = {
  hotel: { category: "hotel", subcategory: "hotel" },
  resort: { category: "hotel", subcategory: "resort" },
  hostel: { category: "hotel", subcategory: "hostel" },
  apartment: { category: "hotel", subcategory: "serviced_apartment" },
  boutique: { category: "hotel", subcategory: "boutique_hotel" },
  luxury: { category: "hotel", subcategory: "luxury_hotel" },
  budget: { category: "hotel", subcategory: "budget_hotel" },
};

function mapCategory(name: string, currentCat: string | null, vertical: string): { category: string; subcategory: string } | null {
  const map = vertical === "hotel" ? HOTEL_CATEGORY_MAP : FOOD_CATEGORY_MAP;
  const text = `${name} ${currentCat ?? ""}`.toLowerCase();

  for (const [key, mapping] of Object.entries(map)) {
    if (text.includes(key)) return mapping;
  }

  return null;
}

export async function runCategoryMappingSync(limit = 100) {
  const INVALID = ["general", "other", "unknown", "", null];

  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, category, subcategory, vertical")
    .not("vertical", "is", null)
    .limit(limit);

  let remapped = 0, alreadyOk = 0;

  for (const m of merchants ?? []) {
    const catInvalid = !m.category || INVALID.includes(m.category?.toLowerCase());
    const subInvalid = !m.subcategory || INVALID.includes(m.subcategory?.toLowerCase());

    if (!catInvalid && !subInvalid) { alreadyOk++; continue; }

    const mapped = mapCategory(m.name, m.category, m.vertical || "food");
    if (mapped) {
      await db.from("seed_merchants").update({
        category: mapped.category,
        subcategory: mapped.subcategory,
        category_mapped_at: new Date().toISOString(),
      }).eq("id", m.id);
      remapped++;
    }
  }

  console.log(`[category-mapping] remapped=${remapped} ok=${alreadyOk}`);
  return { remapped, alreadyOk, total: merchants?.length ?? 0 };
}
