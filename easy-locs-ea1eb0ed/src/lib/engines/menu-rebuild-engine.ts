import { db } from "@/services/db";
import { platformBus } from "@/lib/shared/platform-bus";

import { cFrom, cRpc } from "@/lib/execution/content-mutation";
interface MenuItem {
  name: string;
  price: number | null;
  category?: string;
  section?: string;
}

interface RebuildItem {
  shopId: string;
  shopName: string;
  issue: string;
  action: string;
  persisted: boolean;
}

interface RebuildResult {
  status: string;
  results: RebuildItem[];
  rebuilt: number;
}

function deduplicateMenu(items: MenuItem[]): MenuItem[] {
  const seen = new Map<string, MenuItem>();
  for (const item of items) {
    const key = `${(item.name ?? "").toLowerCase().trim()}|${item.price ?? ""}`;
    if (!seen.has(key)) {
      seen.set(key, item);
    }
  }
  return [...seen.values()];
}

function cleanMenuItems(items: MenuItem[]): MenuItem[] {
  return items
    .filter((item) => item.name && item.name.trim().length >= 2)
    .map((item) => ({
      ...item,
      name: item.name.trim().replace(/\s{2,}/g, " "),
      price: item.price != null && Number(item.price) > 0 ? Number(item.price) : null,
    }));
}

function toMenuItems(raw: unknown): MenuItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r: Record<string, unknown>) => ({
    name: String(r.name ?? ""),
    price: r.price != null ? Number(r.price) : null,
    category: r.category != null ? String(r.category) : undefined,
    section: r.section != null ? String(r.section) : undefined,
  }));
}

export async function runMenuRebuild(batchSize = 200): Promise<RebuildResult> {
  return runMenuRebuildEngine(batchSize);
}

export async function runMenuRebuildEngine(batchSize = 200): Promise<RebuildResult> {
  const { data: merchants } = await cFrom("seed_merchants")
    .select("id, name, vertical, menu_items_json, raw_menu_json, pipeline_stage")
    .in("vertical", ["food", "grocery"])
    .limit(batchSize);

  if (!merchants || merchants.length === 0) {
    return { status: "completed", results: [], rebuilt: 0 };
  }

  const results: RebuildItem[] = [];
  let rebuilt = 0;

  for (const m of merchants) {
    const current = toMenuItems(m.menu_items_json);
    const raw = toMenuItems(m.raw_menu_json);

    if (current.length === 0 && raw.length === 0) {
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "no_menu_data", action: "skipped", persisted: false });
      continue;
    }

    if (current.length === 0 && raw.length > 0) {
      const cleaned = cleanMenuItems(raw);
      let persisted = false;
      if (cleaned.length > 0) {
        try {
          const { error } = await cFrom("seed_merchants")
            .update({ menu_items_json: cleaned })
            .eq("id", m.id);
          persisted = !error;
        } catch {
          persisted = false;
        }
      }
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "menu_empty_but_raw_exists", action: "rebuilt_from_raw", persisted });
      rebuilt++;
      continue;
    }

    const dedupedMenu = deduplicateMenu(current);
    if (dedupedMenu.length < current.length) {
      let persisted = false;
      try {
        const { error } = await cFrom("seed_merchants")
          .update({ menu_items_json: dedupedMenu })
          .eq("id", m.id);
        persisted = !error;
      } catch {
        persisted = false;
      }
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "duplicate_items", action: `deduped_${current.length - dedupedMenu.length}_items`, persisted });
      rebuilt++;
      continue;
    }

    const hasInvalidPrices = current.some((item) => item.price != null && Number(item.price) <= 0);
    if (hasInvalidPrices) {
      const cleaned = cleanMenuItems(current);
      let persisted = false;
      try {
        const { error } = await cFrom("seed_merchants")
          .update({ menu_items_json: cleaned })
          .eq("id", m.id);
        persisted = !error;
      } catch {
        persisted = false;
      }
      results.push({ shopId: m.id, shopName: m.name ?? "", issue: "invalid_prices", action: "prices_cleaned", persisted });
      rebuilt++;
    }
  }

  if (rebuilt > 0) {
    platformBus.emit("FOOD_MENU_NORMALIZED", { rebuilt, total: results.length }, "engine");
  }

  return { status: "completed", results, rebuilt };
}
