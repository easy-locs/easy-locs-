import { db } from "@/services/db";

interface NormResult {
  itemId: string;
  name: string;
  issue: string;
  suggestedFix: string;
}

export async function runFoodMenuNormalizer(shopId?: string) {
  let query = db
    .from("menu_items")
    .select("id, name, description, price, category, image_url, available")
    .limit(500);

  if (shopId) query = query.eq("shop_id", shopId);
  const { data: items } = await query;

  if (!items || items.length === 0) {
    return { status: "completed", results: [], normalized: 0 };
  }

  const results: NormResult[] = [];
  let normalized = 0;

  for (const item of items) {
    if (!item.name || item.name.trim().length < 2) {
      results.push({ itemId: item.id, name: item.name || "", issue: "empty_name", suggestedFix: "Add a descriptive name" });
      normalized++;
      continue;
    }

    if (item.name !== item.name.trim() || /\s{2,}/.test(item.name)) {
      results.push({ itemId: item.id, name: item.name, issue: "whitespace", suggestedFix: item.name.trim().replace(/\s{2,}/g, " ") });
      normalized++;
    }

    if (item.price == null || Number(item.price) <= 0) {
      results.push({ itemId: item.id, name: item.name, issue: "invalid_price", suggestedFix: "Set a valid price > 0" });
      normalized++;
    }

    if (!item.category) {
      results.push({ itemId: item.id, name: item.name, issue: "no_category", suggestedFix: "Assign a category" });
      normalized++;
    }

    if (!item.image_url) {
      results.push({ itemId: item.id, name: item.name, issue: "no_image", suggestedFix: "Add a product photo" });
      normalized++;
    }
  }

  return { status: "completed", results, normalized };
}
