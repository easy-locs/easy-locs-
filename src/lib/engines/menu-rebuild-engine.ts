/**
 * Menu Rebuild Engine — Transforms dirty raw menus into clean canonical structure.
 * Pipeline: Extract → Clean → Dedup → Categorize → Score → Classify (clean/rebuildable/garbage)
 */
import { supabase } from "@/integrations/supabase/client";
import { extractMenuItems } from "./merchant-quality-helpers";

const db = supabase as any;

// ── Junk patterns ──
const JUNK_NAMES = [
  "item", "item 1", "item 2", "item 3", "menu", "menu item", "food", "dish",
  "test", "sample", "example", "placeholder", "untitled", "new item", "product",
  "plat", "n/a", "tbd", "coming soon", "null", "undefined", "none",
];
const URL_REGEX = /https?:\/\/|www\./i;
const NUMERIC_ONLY = /^[\d\s.,€$£¥₹%+\-*/=]+$/;
const TOO_SHORT = 2;

// ── Food category mapping ──
const FOOD_CATEGORIES: Record<string, string[]> = {
  "Pizza": ["pizza", "margherita", "pepperoni", "calzone", "focaccia"],
  "Burgers": ["burger", "cheeseburger", "hamburger", "smash"],
  "Sandwiches": ["sandwich", "wrap", "sub", "panini", "shawarma", "falafel"],
  "Pasta": ["pasta", "spaghetti", "penne", "lasagna", "ravioli", "risotto", "gnocchi"],
  "Salads": ["salad", "salade", "caesar", "fattoush", "tabbouleh"],
  "Desserts": ["dessert", "cake", "ice cream", "brownie", "cheesecake", "tiramisu", "kunafa", "baklava", "cookie", "donut", "muffin", "waffle", "crêpe", "pancake"],
  "Drinks": ["drink", "juice", "smoothie", "coffee", "tea", "latte", "cappuccino", "espresso", "mojito", "water", "soda", "cola", "lemonade", "milkshake"],
  "Breakfast": ["breakfast", "egg", "omelette", "croissant", "toast", "cereal", "granola"],
  "Sides": ["fries", "side", "hummus", "bread", "garlic bread", "onion rings", "coleslaw", "mozzarella sticks", "nuggets", "wings"],
  "Sushi": ["sushi", "maki", "nigiri", "sashimi", "tempura", "ramen", "poke"],
  "Grills": ["grill", "steak", "kebab", "tikka", "bbq", "ribs", "brisket", "lamb"],
  "Seafood": ["fish", "shrimp", "salmon", "lobster", "calamari", "crab", "prawn", "seafood"],
  "Appetizers": ["appetizer", "starter", "soup", "broth", "mezze"],
};

interface RawItem {
  name?: string; item_name?: string; title?: string;
  description?: string; item_description?: string;
  price?: number | string;
  category?: string; category_name?: string; section?: string;
  image?: string; image_url?: string;
}

interface CleanItem {
  name: string;
  canonical_name: string;
  description?: string;
  price?: number;
  category: string;
  image?: string;
}

interface RebuildResult {
  sections: { name: string; items: CleanItem[] }[];
  totalItems: number;
  rebuildScore: number;
  classification: "clean" | "rebuildable" | "garbage";
  stats: {
    rawCount: number;
    junkRemoved: number;
    dupsRemoved: number;
    validItems: number;
    withPrice: number;
    categorized: number;
    uncategorized: number;
    duplicationRate: number;
    priceRate: number;
    categorizationRate: number;
  };
}

function extractName(item: RawItem): string {
  return (item?.name || item?.item_name || item?.title || "").trim();
}

function isJunk(name: string): boolean {
  const lower = name.toLowerCase();
  if (lower.length < TOO_SHORT) return true;
  if (JUNK_NAMES.some(j => lower === j || lower.startsWith(j + " "))) return true;
  if (URL_REGEX.test(name)) return true;
  if (NUMERIC_ONLY.test(name)) return true;
  if (name.length > 200) return true;
  return false;
}

function canonicalizeName(name: string): string {
  let clean = name.trim();
  // Remove leading numbers/bullets
  clean = clean.replace(/^[\d.)\-•·]+\s*/, "");
  // Remove trailing punctuation
  clean = clean.replace(/[.,:;!?]+$/, "");
  // Title case
  clean = clean.replace(/\b\w/g, c => c.toUpperCase());
  return clean.trim();
}

function detectCategory(name: string, desc?: string): string {
  const text = `${name} ${desc || ""}`.toLowerCase();
  for (const [cat, keywords] of Object.entries(FOOD_CATEGORIES)) {
    if (keywords.some(kw => text.includes(kw))) return cat;
  }
  return "Uncategorized";
}

function parsePrice(raw: any): number | undefined {
  if (typeof raw === "number" && raw > 0) return raw;
  if (typeof raw === "string") {
    const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
    const num = parseFloat(cleaned);
    if (!isNaN(num) && num > 0 && num < 100000) return num;
  }
  return undefined;
}

function similarity(a: string, b: string): number {
  const al = a.toLowerCase(), bl = b.toLowerCase();
  if (al === bl) return 1;
  const longer = al.length > bl.length ? al : bl;
  const shorter = al.length > bl.length ? bl : al;
  if (longer.length === 0) return 1;
  // Simple containment check
  if (longer.includes(shorter) && shorter.length / longer.length > 0.7) return 0.85;
  return 0;
}

function stripDuplicateMenuImages(items: CleanItem[]): { items: CleanItem[]; duplicateImagesStripped: number } {
  // Count how many times each image URL appears
  const imageCounts = new Map<string, number>();
  for (const item of items) {
    if (item.image) {
      const key = item.image.toLowerCase().trim();
      imageCounts.set(key, (imageCounts.get(key) || 0) + 1);
    }
  }

  let stripped = 0;
  const cleaned = items.map(item => {
    if (!item.image) return item;
    const key = item.image.toLowerCase().trim();
    const count = imageCounts.get(key) || 0;
    // If more than 1 item uses the same image → it's a fake/duplicated image, strip it
    if (count > 1) {
      stripped++;
      return { ...item, image: undefined };
    }
    return item;
  });

  return { items: cleaned, duplicateImagesStripped: stripped };
}

function rebuildMenu(rawItems: RawItem[]): RebuildResult {
  const rawCount = rawItems.length;
  let junkRemoved = 0;
  let dupsRemoved = 0;

  // Step 1: Extract and clean
  const extracted: CleanItem[] = [];
  for (const item of rawItems) {
    const name = extractName(item);
    if (!name || isJunk(name)) { junkRemoved++; continue; }
    extracted.push({
      name,
      canonical_name: canonicalizeName(name),
      description: (item?.description || item?.item_description || "").trim() || undefined,
      price: parsePrice(item?.price),
      category: (item?.category || item?.category_name || item?.section || "").trim() || "",
      image: item?.image || item?.image_url || undefined,
    });
  }

  // Step 2: Dedup names
  const deduped: CleanItem[] = [];
  const seen = new Set<string>();
  for (const item of extracted) {
    const key = item.canonical_name.toLowerCase();
    if (seen.has(key)) { dupsRemoved++; continue; }
    let isDup = false;
    for (const existing of deduped) {
      if (similarity(item.canonical_name, existing.canonical_name) > 0.8) {
        isDup = true;
        dupsRemoved++;
        break;
      }
    }
    if (!isDup) {
      seen.add(key);
      deduped.push(item);
    }
  }

  // Step 2b: Strip duplicate images (same photo used across multiple items = fake)
  const { items: imageCleanedItems, duplicateImagesStripped } = stripDuplicateMenuImages(deduped);

  // Step 3: Auto-categorize
  for (const item of imageCleanedItems) {
    if (!item.category || item.category === "Main" || item.category.toLowerCase() === "uncategorized") {
      item.category = detectCategory(item.canonical_name, item.description);
    }
  }

  // Step 4: Build sections
  const groups: Record<string, CleanItem[]> = {};
  for (const item of imageCleanedItems) {
    const cat = item.category || "Uncategorized";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  }
  const sections = Object.entries(groups)
    .sort(([a], [b]) => a === "Uncategorized" ? 1 : b === "Uncategorized" ? -1 : a.localeCompare(b))
    .map(([name, items]) => ({ name, items }));

  // Step 5: Calculate scores
  const validItems = imageCleanedItems.length;
  const withPrice = imageCleanedItems.filter(i => i.price !== undefined).length;
  const categorized = imageCleanedItems.filter(i => i.category !== "Uncategorized").length;
  const uncategorized = validItems - categorized;
  const duplicationRate = rawCount > 0 ? dupsRemoved / rawCount : 0;
  const priceRate = validItems > 0 ? withPrice / validItems : 0;
  const categorizationRate = validItems > 0 ? categorized / validItems : 0;

  // Rebuild score: 0-100
  let score = 0;
  if (validItems >= 3) score += 20;
  else if (validItems >= 1) score += 10;
  score += Math.min(30, priceRate * 30);
  score += Math.min(20, categorizationRate * 20);
  score += Math.min(15, Math.max(0, (1 - duplicationRate) * 15));
  if (junkRemoved / Math.max(rawCount, 1) < 0.3) score += 15;
  else if (junkRemoved / Math.max(rawCount, 1) < 0.6) score += 7;

  // Penalize if many duplicate images were stripped (sign of fake/scraped data)
  if (duplicateImagesStripped > 3) score -= 10;

  const rebuildScore = Math.round(Math.max(0, Math.min(100, score)));
  const classification: "clean" | "rebuildable" | "garbage" =
    rebuildScore >= 70 ? "clean" :
    rebuildScore >= 35 ? "rebuildable" :
    "garbage";

  return {
    sections,
    totalItems: validItems,
    rebuildScore,
    classification,
    stats: {
      rawCount, junkRemoved, dupsRemoved, validItems,
      withPrice, categorized, uncategorized,
      duplicationRate: Math.round(duplicationRate * 100),
      priceRate: Math.round(priceRate * 100),
      categorizationRate: Math.round(categorizationRate * 100),
    },
  };
}

export async function runMenuRebuildEngine(limit = 100) {
  const { data: merchants } = await db
    .from("seed_merchants")
    .select("id, name, menu_items_json, raw_menu_json, vertical, vertical_locked, menu_quality_score, pipeline_stage")
    .eq("vertical", "food")
    .limit(limit);

  let rebuilt = 0, blocked = 0, skipped = 0, alreadyClean = 0;

  for (const m of merchants ?? []) {
    // Use raw_menu_json if available, else menu_items_json
    const source = m.raw_menu_json || m.menu_items_json;
    if (!source) { skipped++; continue; }

    const rawItems: RawItem[] = extractMenuItems(source);

    if (rawItems.length === 0) {
      // Empty menu → block
      await db.from("seed_merchants").update({
        menu_quality_flag: "empty_after_cleanup",
        menu_quality_score: 0,
        menu_sections_json: [],
        visibility_mode: "hidden",
        blocking_reason: "menu_empty",
      }).eq("id", m.id);
      blocked++;
      continue;
    }

    const result = rebuildMenu(rawItems);

    if (result.classification === "garbage") {
      await db.from("seed_merchants").update({
        menu_quality_flag: "garbage",
        menu_quality_score: result.rebuildScore,
        menu_sections_json: result.sections,
        visibility_mode: "hidden",
        blocking_reason: `garbage_menu: score=${result.rebuildScore} valid=${result.stats.validItems}`,
      }).eq("id", m.id);
      blocked++;
      continue;
    }

    if (result.classification === "clean") alreadyClean++;

    // Write rebuilt menu
    await db.from("seed_merchants").update({
      menu_items_json: { sections: result.sections, totalItems: result.totalItems },
      menu_sections_json: result.sections,
      menu_quality_score: result.rebuildScore,
      menu_quality_flag: result.classification === "clean" ? "clean" : "rebuilt",
      menu_normalized_at: new Date().toISOString(),
      ...(result.classification === "rebuildable" && result.rebuildScore < 50
        ? { visibility_mode: "search_only", blocking_reason: `low_rebuild_score: ${result.rebuildScore}` }
        : {}),
    }).eq("id", m.id);
    rebuilt++;
  }

  console.log(`[menu-rebuild] rebuilt=${rebuilt} blocked=${blocked} skipped=${skipped} clean=${alreadyClean}`);
  return { rebuilt, blocked, skipped, alreadyClean, total: merchants?.length ?? 0 };
}
