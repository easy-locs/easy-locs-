/**
 * Vertical Classifier Engine — Classifies shops into the correct vertical
 * BEFORE any normalization pipeline runs. Prevents food logic on hotels.
 */
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;

const VERTICAL_SIGNALS: Record<string, { keywords: string[]; vertical: string }> = {
  food: {
    keywords: ["restaurant", "food", "cuisine", "kitchen", "diner", "bistro", "grill", "café", "cafe", "pizza", "burger", "sushi", "shawarma", "bakery", "patisserie", "coffee", "juice", "dessert", "ice cream", "chocolat"],
    vertical: "food",
  },
  hotel: {
    keywords: ["hotel", "resort", "hostel", "motel", "suite", "inn", "lodge", "guesthouse", "apart-hotel", "aparthotel", "bed and breakfast", "b&b", "accommodation", "rooms", "check-in", "check-out"],
    vertical: "hotel",
  },
  grocery: {
    keywords: ["grocery", "supermarket", "mart", "market", "store", "minimarket", "hypermarket", "organic", "fresh"],
    vertical: "grocery",
  },
  services: {
    keywords: ["salon", "barber", "beauty", "spa", "nails", "gym", "fitness", "laundry", "cleaning", "repair", "plumber", "electrician", "mechanic"],
    vertical: "services",
  },
  pharmacy: {
    keywords: ["pharmacy", "pharma", "drug", "medical", "health", "clinic", "dental", "optical"],
    vertical: "healthcare",
  },
  shopping: {
    keywords: ["shop", "boutique", "fashion", "clothing", "electronics", "furniture", "jewelry", "gifts", "toys", "pet"],
    vertical: "shops",
  },
};

function classifyVertical(name: string, description?: string | null, category?: string | null, menuJson?: any): string {
  const text = `${name} ${description ?? ""} ${category ?? ""}`.toLowerCase();

  // Check menu structure for hotel signals (room types, rates)
  if (menuJson && !Array.isArray(menuJson)) {
    const keys = Object.keys(menuJson).map(k => k.toLowerCase());
    if (keys.some(k => ["rooms", "room_types", "rates", "amenities", "policies"].includes(k))) {
      return "hotel";
    }
  }

  let bestMatch = "food"; // default
  let bestScore = 0;

  for (const [, config] of Object.entries(VERTICAL_SIGNALS)) {
    const score = config.keywords.filter(k => text.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = config.vertical;
    }
  }

  return bestMatch;
}

export async function runVerticalClassifier(limit = 100) {
  const { data: unclassified } = await db
    .from("seed_merchants")
    .select("id, name, description, category, subcategory, menu_items_json, vertical")
    .or("vertical.is.null,vertical.eq.")
    .limit(limit);

  let classified = 0, changed = 0;
  for (const m of unclassified ?? []) {
    const vertical = classifyVertical(m.name, m.description, m.category, m.menu_items_json);
    classified++;

    if (vertical !== m.vertical) {
      await db.from("seed_merchants").update({ vertical }).eq("id", m.id);
      changed++;
    }
  }

  console.log(`[vertical-classifier] classified=${classified} changed=${changed}`);
  return { classified, changed };
}
