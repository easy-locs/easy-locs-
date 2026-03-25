/**
 * Food Menu Normalizer Engine — Rebuilds real menus from source data.
 * ONLY runs on vertical=food AND vertical_locked=true.
 * Never invents items not in source. Preserves raw data.
 * Sets pipeline_stage to "normalized_food".
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

const GENERIC_NAMES = ["item 1", "item 2", "menu item", "product", "test", "sample", "example", "placeholder", "untitled", "new item"];

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
    if (GENERIC_NAMES.some(g => name.toLowerCase().includes(g))) continue;

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

  // Strip duplicate images: if multiple items share the same image, it's fake
  const imageCounts = new Map<string, number>();
  for (const item of cleaned) {
    if (item.image) {
      const k = item.image.toLowerCase().trim();
      imageCounts.set(k, (imageCounts.get(k) || 0) + 1);
    }
  }
  for (const item of cleaned) {
    if (item.image && (imageCounts.get(item.image.toLowerCase().trim()) || 0) > 1) {
      item.image = undefined;
    }
  }

  return cleaned;
}

function buildNormalizedMenu(items: MenuItem[]): { sections: { name: string; items: MenuItem[] }[]; totalItems: number } {
  const groups: Record<string, MenuItem[]> = {};
  for (const item of items) {
    const cat = item.category || "Main";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }

  const sections = Object.entries(groups).map(([name, sectionItems]) => ({ name, items: sectionItems }));
  return { sections, totalItems: items.length };
}

export async function runFoodMenuNormalizer(limit = 50) {
  // STRICT: Only runs on vertical=food with locked vertical
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, vertical, vertical_locked, menu_normalized_at")
    .eq("vertical", "food")
    .is("menu_normalized_at", null)
    .not("menu_items_json", "is", null)
    .limit(limit);

  let normalized = 0, skipped = 0, emptied = 0;

  for (const m of merchants ?? []) {
    // GUARD: Skip if vertical not locked (classification not stable)
    if (!m.vertical_locked) { skipped++; continue; }

    // Preserve raw source
    await db.from("seed_merchants").update({
      raw_menu_json: m.menu_items_json,
    }).eq("id", m.id);

    const raw = Array.isArray(m.menu_items_json)
      ? m.menu_items_json
      : m.menu_items_json?.items || m.menu_items_json?.sections?.flatMap((s: any) => s.items || []) || [];

    const cleaned = cleanMenuItems(raw);

    if (cleaned.length === 0) {
      emptied++;
      await db.from("seed_merchants").update({
        menu_normalized_at: new Date().toISOString(),
        menu_quality_flag: "empty_after_cleanup",
        pipeline_stage: "normalized_food",
      }).eq("id", m.id);
      continue;
    }

    const menu = buildNormalizedMenu(cleaned);
    const uniqueRatio = cleaned.length / Math.max(raw.length, 1);
    const qualityFlag = uniqueRatio < 0.5 ? "high_duplication" : cleaned.length < 3 ? "too_few_items" : "clean";

    await db.from("seed_merchants").update({
      menu_items_json: menu,
      menu_normalized_at: new Date().toISOString(),
      menu_quality_flag: qualityFlag,
      pipeline_stage: "normalized_food",
    }).eq("id", m.id);

    normalized++;

    // Emit event
    platformBus.emit("FOOD_MENU_NORMALIZED" as any, {
      entityId: m.id,
      totalItems: menu.totalItems,
      sections: menu.sections.length,
      qualityFlag,
    }, "system");
  }

  console.log(`[food-menu-normalizer] normalized=${normalized} skipped=${skipped} emptied=${emptied}`);
  return { normalized, skipped, emptied };
}
