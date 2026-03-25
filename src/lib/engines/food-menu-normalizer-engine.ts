/**
 * Food Menu Normalizer Engine — Rebuilds real menus from source data.
 * ONLY runs on vertical=food. Never invents items not in source.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "menu item", "product", "test", "sample", "example", "placeholder", "untitled", "new item"];
const DUPLICATE_THRESHOLD = 0.5;

interface MenuItem {
  name: string;
  description?: string;
  price?: number;
  category?: string;
  image?: string;
}

function cleanMenuItems(items: any[]): MenuItem[] {
  if (!Array.isArray(items)) return [];

  const cleaned: MenuItem[] = [];
  const seen = new Set<string>();

  for (const item of items) {
    const name = (item?.name || item?.item_name || "").trim();
    if (!name) continue;

    // Skip generic names
    if (GENERIC_NAMES.some(g => name.toLowerCase().includes(g))) continue;

    // Skip exact duplicates
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    cleaned.push({
      name,
      description: (item?.description || item?.item_description || "").trim() || undefined,
      price: typeof item?.price === "number" ? item.price : parseFloat(item?.price) || undefined,
      category: (item?.category || item?.category_name || item?.section || "").trim() || "Main",
      image: item?.image || item?.image_url || undefined,
    });
  }

  return cleaned;
}

function groupByCategory(items: MenuItem[]): Record<string, MenuItem[]> {
  const groups: Record<string, MenuItem[]> = {};
  for (const item of items) {
    const cat = item.category || "Main";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  return groups;
}

function buildNormalizedMenu(items: MenuItem[]): { sections: { name: string; items: MenuItem[] }[]; totalItems: number } {
  const grouped = groupByCategory(items);
  const sections = Object.entries(grouped).map(([name, sectionItems]) => ({
    name,
    items: sectionItems,
  }));

  return { sections, totalItems: items.length };
}

export async function runFoodMenuNormalizer(limit = 50) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, menu_normalized_at")
    .eq("vertical", "food")
    .is("menu_normalized_at", null)
    .not("menu_items_json", "is", null)
    .limit(limit);

  let normalized = 0, skipped = 0, emptied = 0;

  for (const m of merchants ?? []) {
    const raw = Array.isArray(m.menu_items_json)
      ? m.menu_items_json
      : m.menu_items_json?.items || m.menu_items_json?.sections?.flatMap((s: any) => s.items || []) || [];

    const cleaned = cleanMenuItems(raw);

    if (cleaned.length === 0) {
      emptied++;
      await db.from("seed_merchants").update({
        menu_normalized_at: new Date().toISOString(),
        menu_quality_flag: "empty_after_cleanup",
      }).eq("id", m.id);
      continue;
    }

    const menu = buildNormalizedMenu(cleaned);

    // Check duplicate ratio
    const uniqueRatio = cleaned.length / Math.max(raw.length, 1);
    const qualityFlag = uniqueRatio < DUPLICATE_THRESHOLD ? "high_duplication" : cleaned.length < 3 ? "too_few_items" : "clean";

    await db.from("seed_merchants").update({
      menu_items_json: menu,
      menu_normalized_at: new Date().toISOString(),
      menu_quality_flag: qualityFlag,
    }).eq("id", m.id);

    normalized++;
  }

  console.log(`[food-menu-normalizer] normalized=${normalized} skipped=${skipped} emptied=${emptied}`);
  return { normalized, skipped, emptied };
}
