/**
 * taxonomy.category.map — Maps raw categories to canonical taxonomy.
 * ONE thing: canonical category assignment.
 */
import type { TaxonomyCategoryMapping } from "../contracts";
import type { Vertical } from "../../types";

const FOOD_CATEGORIES: Record<string, string> = {
  pizza: "pizza", burger: "burgers", sushi: "japanese", chinese: "chinese",
  indian: "indian", lebanese: "lebanese", italian: "italian", thai: "thai",
  mexican: "mexican", american: "american", turkish: "turkish",
  bakery: "bakery", cafe: "cafe", coffee: "cafe", dessert: "desserts",
  seafood: "seafood", grill: "grill", bbq: "grill",
};

const HOTEL_CATEGORIES: Record<string, string> = {
  hotel: "hotel", resort: "resort", hostel: "hostel", "boutique hotel": "boutique",
  "business hotel": "business", apartment: "serviced_apartment",
};

export function mapCategory(
  vertical: Vertical,
  categories: string[],
  subcategories: string[],
): TaxonomyCategoryMapping {
  const allCats = [...categories, ...subcategories].map((c) => c.trim().toLowerCase());
  const tags = [...new Set([...categories, ...subcategories])];

  if (vertical === "food") {
    for (const cat of allCats) {
      const mapped = FOOD_CATEGORIES[cat];
      if (mapped) {
        return { vertical: "food", category: "restaurant", subcategory: mapped, tags, confidence: 0.85 };
      }
    }
    return { vertical: "food", category: "restaurant", subcategory: "general_food", tags, confidence: 0.5 };
  }

  if (vertical === "hotel") {
    for (const cat of allCats) {
      const mapped = HOTEL_CATEGORIES[cat];
      if (mapped) {
        return { vertical: "stays", category: "hotel", subcategory: mapped, tags, confidence: 0.85 };
      }
    }
    return { vertical: "stays", category: "hotel", subcategory: "hotel", tags, confidence: 0.5 };
  }

  if (vertical === "grocery") {
    return { vertical: "grocery", category: "grocery_store", subcategory: "general_grocery", tags, confidence: 0.6 };
  }

  if (vertical === "services") {
    return {
      vertical: "services",
      category: categories[0] ?? "general_services",
      subcategory: subcategories[0] ?? null,
      tags,
      confidence: 0.6,
    };
  }

  if (vertical === "property") {
    return {
      vertical: "property",
      category: "listing",
      subcategory: subcategories[0] ?? "general_property",
      tags,
      confidence: 0.6,
    };
  }

  return { vertical, category: categories[0] ?? null, subcategory: subcategories[0] ?? null, tags, confidence: 0.3 };
}
