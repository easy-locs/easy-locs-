/**
 * Grocery Normalizer Engine — Processes grocery-vertical entities.
 * Handles product catalogs, aisles, weights/units. NEVER uses food menu or hotel logic.
 * Only runs on vertical=grocery.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

interface GroceryProduct {
  name: string;
  brand?: string;
  price?: number;
  unit?: string;
  weight?: string;
  aisle?: string;
  image?: string;
}

interface GroceryCatalog {
  products: GroceryProduct[];
  aisles: string[];
  totalProducts: number;
  hasPricing: boolean;
}

function extractProducts(data: any): GroceryProduct[] {
  if (!data) return [];
  const products: GroceryProduct[] = [];

  const rawItems = data.products || data.items || data.menu_items ||
    (Array.isArray(data) ? data : data.sections?.flatMap((s: any) => s.items || []) || []);

  for (const item of Array.isArray(rawItems) ? rawItems : []) {
    const name = (item.name || item.product_name || item.title || "").trim();
    if (!name) continue;

    products.push({
      name,
      brand: (item.brand || item.brand_name || "").trim() || undefined,
      price: parseFloat(item.price || item.unit_price) || undefined,
      unit: item.unit || item.uom || undefined,
      weight: item.weight || item.size || undefined,
      aisle: (item.aisle || item.category || item.department || "General").trim(),
      image: item.image || item.image_url || undefined,
    });
  }

  return products;
}

function buildGroceryCatalog(products: GroceryProduct[]): GroceryCatalog {
  const aisles = [...new Set(products.map(p => p.aisle || "General"))];
  return {
    products,
    aisles,
    totalProducts: products.length,
    hasPricing: products.some(p => p.price != null && p.price > 0),
  };
}

export async function runGroceryNormalizer(limit = 50) {
  const { data: entities } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, vertical_locked, grocery_catalog_at")
    .eq("vertical", "grocery")
    .is("grocery_catalog_at", null)
    .limit(limit);

  let normalized = 0, skipped = 0;

  for (const entity of entities ?? []) {
    const sourceData = entity.menu_items_json;
    if (!sourceData) { skipped++; continue; }

    const products = extractProducts(sourceData);
    const catalog = buildGroceryCatalog(products);

    await db.from("seed_merchants").update({
      grocery_catalog_json: catalog,
      grocery_catalog_at: new Date().toISOString(),
      pipeline_stage: "normalized_grocery",
      menu_quality_flag: products.length > 0 ? "grocery_catalog_ok" : "no_products_found",
    }).eq("id", entity.id);

    normalized++;
  }

  console.log(`[grocery-normalizer] normalized=${normalized} skipped=${skipped}`);
  return { normalized, skipped };
}
