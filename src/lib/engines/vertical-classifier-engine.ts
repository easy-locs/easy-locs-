/**
 * Vertical Classifier Engine — Classifies shops into the correct vertical
 * BEFORE any normalization pipeline runs. Prevents food logic on hotels.
 * 
 * STRICT RULES:
 * - No fallback to "food" if ambiguous → sets "unknown" + needs_review
 * - Sets vertical_confidence score
 * - Locks vertical when confidence >= 0.7
 * - Updates pipeline_stage to "vertical_classified"
 */
import { supabase } from "@/integrations/supabase/client";
import { platformBus } from "@/lib/shared/platform-bus";

const db = supabase as any;

const VERTICAL_SIGNALS: Record<string, { keywords: string[]; vertical: string }> = {
  food: {
    keywords: ["restaurant", "food", "cuisine", "kitchen", "diner", "bistro", "grill", "café", "cafe", "pizza", "burger", "sushi", "shawarma", "bakery", "patisserie", "coffee", "juice", "dessert", "ice cream", "chocolat", "bbq", "steakhouse", "ramen", "poke", "tacos", "wings", "fried chicken", "noodles", "curry", "biryani", "falafel", "crepe", "waffle", "donut", "smoothie", "tea", "bubble tea"],
    vertical: "food",
  },
  hotel: {
    keywords: ["hotel", "resort", "hostel", "motel", "suite", "inn", "lodge", "guesthouse", "apart-hotel", "aparthotel", "bed and breakfast", "b&b", "accommodation", "rooms", "check-in", "check-out", "booking", "stay", "night"],
    vertical: "hotel",
  },
  grocery: {
    keywords: ["grocery", "supermarket", "mart", "market", "store", "minimarket", "hypermarket", "organic", "fresh produce", "wholesale"],
    vertical: "grocery",
  },
  services: {
    keywords: ["salon", "barber", "beauty", "spa", "nails", "gym", "fitness", "laundry", "cleaning", "repair", "plumber", "electrician", "mechanic", "tailor", "car wash", "pet grooming", "massage", "physiotherapy", "tutor", "photography"],
    vertical: "services",
  },
  healthcare: {
    keywords: ["pharmacy", "pharma", "drug", "medical", "health", "clinic", "dental", "optical", "hospital", "doctor", "lab"],
    vertical: "healthcare",
  },
  shops: {
    keywords: ["shop", "boutique", "fashion", "clothing", "electronics", "furniture", "jewelry", "gifts", "toys", "pet shop", "bookstore", "stationery", "hardware"],
    vertical: "shops",
  },
};

function classifyVertical(name: string, description?: string | null, category?: string | null, menuJson?: any): { vertical: string; confidence: number } {
  const text = `${name} ${description ?? ""} ${category ?? ""}`.toLowerCase();

  // Check menu structure for hotel signals (room types, rates)
  if (menuJson && !Array.isArray(menuJson)) {
    const keys = Object.keys(menuJson).map(k => k.toLowerCase());
    if (keys.some(k => ["rooms", "room_types", "rates", "amenities", "policies"].includes(k))) {
      return { vertical: "hotel", confidence: 0.95 };
    }
  }

  let bestMatch = "";
  let bestScore = 0;
  let totalSignals = 0;

  for (const [, config] of Object.entries(VERTICAL_SIGNALS)) {
    const score = config.keywords.filter(k => text.includes(k)).length;
    totalSignals += score;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = config.vertical;
    }
  }

  // STRICT: No fallback to food. If no signal or ambiguous → unknown
  if (bestScore === 0) {
    return { vertical: "unknown", confidence: 0 };
  }

  // Confidence = how dominant the winning vertical is
  const confidence = Math.min(bestScore / Math.max(totalSignals, 1) + (bestScore >= 3 ? 0.3 : 0), 1);
  
  return { vertical: bestMatch, confidence: Math.round(confidence * 100) / 100 };
}

export async function runVerticalClassifier(limit = 100) {
  const { data: unclassified } = await db
    .from("seed_merchants")
    .select("id, name, description, category, subcategory, menu_items_json, vertical, vertical_locked")
    .or("vertical.is.null,vertical.eq.,vertical.eq.unknown")
    .eq("vertical_locked", false)
    .limit(limit);

  let classified = 0, changed = 0, locked = 0, needsReview = 0;

  for (const m of unclassified ?? []) {
    // Skip already locked verticals
    if (m.vertical_locked) continue;

    const result = classifyVertical(m.name, m.description, m.category, m.menu_items_json);
    classified++;

    const shouldLock = result.confidence >= 0.7;
    const pipelineStage = result.vertical === "unknown" ? "needs_review" : "vertical_classified";

    if (result.vertical === "unknown") {
      needsReview++;
    }

    const update: Record<string, any> = {
      vertical: result.vertical,
      vertical_confidence: result.confidence,
      vertical_locked: shouldLock,
      pipeline_stage: pipelineStage,
    };

    if (shouldLock) locked++;

    if (result.vertical !== m.vertical) {
      changed++;
      
      // Preserve raw source data per vertical
      if (m.menu_items_json) {
        if (result.vertical === "food") update.raw_menu_json = m.menu_items_json;
        else if (result.vertical === "hotel") update.raw_hotel_inventory_json = m.menu_items_json;
        else if (result.vertical === "services") update.raw_service_catalog_json = m.menu_items_json;
      }
    }

    await db.from("seed_merchants").update(update).eq("id", m.id);

    // Emit vertical event
    platformBus.emit("ENTITY_CLASSIFIED" as any, {
      entityId: m.id,
      vertical: result.vertical,
      confidence: result.confidence,
      locked: shouldLock,
    }, "system");
  }

  console.log(`[vertical-classifier] classified=${classified} changed=${changed} locked=${locked} needsReview=${needsReview}`);
  return { classified, changed, locked, needsReview };
}
