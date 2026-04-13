import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

interface GroceryNormResult {
  shopId: string;
  shopName: string;
  issue: string;
  suggestedFix: string;
}

interface GroceryItem {
  name: string;
  price: number | null;
  category: string | null;
  section: string | null;
  unit: string | null;
  weight: string | null;
}

function toGroceryItems(raw: unknown): GroceryItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: r.name != null ? String(r.name) : "",
    price: r.price != null ? Number(r.price) : null,
    category: r.category != null ? String(r.category) : null,
    section: r.section != null ? String(r.section) : null,
    unit: r.unit != null ? String(r.unit) : null,
    weight: r.weight != null ? String(r.weight) : null,
  }));
}

export async function runGroceryNormalizer(batchSize = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, pipeline_stage")
    .eq("vertical", "grocery")
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], normalized: 0 };
  }

  const results: GroceryNormResult[] = [];
  let normalized = 0;

  for (const m of merchants) {
    const items = toGroceryItems(m.menu_items_json);

    if (items.length === 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "empty_catalog", suggestedFix: "Add grocery items" });
      normalized++;
      continue;
    }

    for (const item of items) {
      if (!item.name || item.name.trim().length < 2) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_no_name", suggestedFix: "Add a product name" });
        normalized++;
        continue;
      }

      if (item.name !== item.name.trim() || /\s{2,}/.test(item.name)) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_whitespace", suggestedFix: item.name.trim().replace(/\s{2,}/g, " ") });
        normalized++;
      }

      if (item.price == null || Number(item.price) <= 0) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_invalid_price", suggestedFix: "Set a valid price > 0" });
        normalized++;
      }

      if (!item.category && !item.section) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_no_category", suggestedFix: "Assign a section or category" });
        normalized++;
      }

      if (!item.unit && !item.weight) {
        results.push({ shopId: m.id, shopName: m.name ?? "", issue: "item_no_unit", suggestedFix: "Add unit or weight info" });
        normalized++;
      }
    }
  }

  if (normalized > 0) {
    platformBus.emit("GROCERY_CATALOG_NORMALIZED", { normalized, total: results.length }, "engine");
  }

  return { status: "completed", results, normalized };
}
