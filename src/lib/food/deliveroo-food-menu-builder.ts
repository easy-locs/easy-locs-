/**
 * Deliveroo Food Pipeline — Menu Builder
 * Builds canonical menu structure from raw Deliveroo data.
 */
import type {
  DeliverooRawMenu,
  FoodNormalizedMenu,
  FoodNormalizedMenuCategory,
  FoodNormalizedMenuItem,
} from "./deliveroo-food-types";
import { slugifyMerchantName } from "./deliveroo-food-utils";
import { inferMenuFamily, normalizeMenuCategoryName } from "./deliveroo-food-classifier";

export function buildCanonicalMenu(raw: DeliverooRawMenu | null | undefined): FoodNormalizedMenu | null {
  if (!raw?.categories?.length) return null;

  const categoryMap = new Map<string, FoodNormalizedMenuItem[]>();
  let totalItems = 0;

  for (const rawCat of raw.categories) {
    const catName = normalizeMenuCategoryName(rawCat.name);
    if (!rawCat.items?.length) continue;

    for (const item of rawCat.items) {
      if (!item.name?.trim()) continue;

      const family = catName || inferMenuFamily(item.name, item.description);
      const normalizedItem: FoodNormalizedMenuItem = {
        id: `item_${totalItems}_${slugifyMerchantName(item.name)}`,
        name: item.name.trim(),
        slug: slugifyMerchantName(item.name),
        description: item.description?.trim() || "",
        price: typeof item.price === "number" ? item.price : 0,
        currency: item.currency || "AED",
        image: item.image || null,
        category_name: family,
        tags: [],
        available: item.available !== false,
      };

      const existing = categoryMap.get(family) || [];
      existing.push(normalizedItem);
      categoryMap.set(family, existing);
      totalItems++;
    }
  }

  if (totalItems === 0) return null;

  // Remove empty categories, sort by item count
  const categories: FoodNormalizedMenuCategory[] = [];
  for (const [name, items] of categoryMap) {
    if (items.length === 0) continue;
    categories.push({
      name,
      slug: slugifyMerchantName(name),
      items,
    });
  }

  categories.sort((a, b) => b.items.length - a.items.length);

  return { categories, total_items: totalItems };
}

export function countMenuItems(menu: FoodNormalizedMenu | null): number {
  if (!menu) return 0;
  return menu.total_items;
}

export function countMenuCategories(menu: FoodNormalizedMenu | null): number {
  if (!menu) return 0;
  return menu.categories.length;
}

export function hasValidPrices(menu: FoodNormalizedMenu | null): boolean {
  if (!menu) return false;
  return menu.categories.some((c) =>
    c.items.some((i) => i.price > 0)
  );
}
