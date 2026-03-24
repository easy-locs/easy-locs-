/**
 * Entity-Menu Coherence Engine
 * Prevents cross-vertical contamination (e.g., sushi shop with pizza menu).
 * Extends existing engines — no duplication.
 */

// ── Canonical keyword maps per vertical/subcategory ──

const VERTICAL_KEYWORDS: Record<string, string[]> = {
  food: ["meal", "dish", "plate", "combo", "menu", "appetizer", "entree", "dessert", "drink", "beverage"],
  grocery: ["fresh", "produce", "organic", "pack", "bottle", "can", "box", "kg", "gram", "liter"],
  bakery: ["bread", "baguette", "croissant", "pastry", "cake", "muffin", "cookie", "roll", "bun", "pie"],
  pharmacy: ["tablet", "capsule", "mg", "ml", "dose", "supplement", "vitamin", "cream", "gel", "syrup"],
  retail: ["piece", "item", "accessory", "gadget", "device", "charger", "cable", "case"],
};

const SUBCATEGORY_KEYWORDS: Record<string, string[]> = {
  sushi: ["sushi", "sashimi", "maki", "nigiri", "roll", "tempura", "ramen", "udon", "edamame", "wasabi", "soy", "ginger", "teriyaki", "katsu", "gyoza", "japanese"],
  pizza: ["pizza", "margherita", "pepperoni", "calzone", "focaccia", "marinara", "mozzarella", "dough", "crust", "italian", "pasta", "lasagna", "risotto"],
  burger: ["burger", "patty", "bun", "fries", "onion ring", "milkshake", "ketchup", "mustard", "coleslaw", "american"],
  shawarma: ["shawarma", "kebab", "falafel", "hummus", "tahini", "pita", "wrap", "garlic sauce", "arabic", "grilled", "lamb", "chicken wrap"],
  chinese: ["wok", "noodle", "dim sum", "dumpling", "fried rice", "spring roll", "chow mein", "sweet sour", "kung pao", "szechuan"],
  indian: ["curry", "naan", "biryani", "tandoori", "masala", "tikka", "samosa", "dal", "paneer", "chapati", "raita"],
  mexican: ["taco", "burrito", "quesadilla", "nachos", "guacamole", "salsa", "enchilada", "chimichanga", "tortilla", "jalapeño"],
  bakery: ["bread", "baguette", "croissant", "brioche", "pain", "pastry", "éclair", "macaron", "mille-feuille", "tart", "scone"],
  fruits_vegetables: ["apple", "banana", "orange", "tomato", "potato", "onion", "carrot", "lettuce", "avocado", "mango", "grape", "strawberry", "cucumber", "pepper", "spinach"],
  pharmacy: ["panadol", "ibuprofen", "vitamin", "bandage", "antiseptic", "thermometer", "mask", "sanitizer", "aspirin", "allergy"],
  coffee: ["espresso", "latte", "cappuccino", "americano", "mocha", "macchiato", "cold brew", "frappuccino", "coffee bean"],
  seafood: ["fish", "shrimp", "lobster", "crab", "oyster", "calamari", "salmon", "tuna", "prawn", "scallop", "clam"],
  ice_cream: ["ice cream", "gelato", "sorbet", "sundae", "cone", "scoop", "frozen yogurt", "milkshake"],
};

// ── Forbidden cross-contamination pairs ──
const FORBIDDEN_PAIRS: Record<string, string[]> = {
  sushi: ["pizza", "burger", "shawarma", "bakery", "pharmacy", "fruits_vegetables"],
  pizza: ["sushi", "pharmacy", "fruits_vegetables"],
  burger: ["sushi", "pharmacy", "bakery"],
  shawarma: ["sushi", "pharmacy", "bakery"],
  bakery: ["sushi", "pizza", "burger", "shawarma", "pharmacy"],
  pharmacy: ["sushi", "pizza", "burger", "shawarma", "bakery", "fruits_vegetables", "seafood"],
  fruits_vegetables: ["sushi", "pizza", "burger", "shawarma", "pharmacy"],
  coffee: ["pharmacy", "fruits_vegetables"],
};

export interface CoherenceInput {
  entity_name: string;
  entity_vertical: string;
  entity_subcategory: string | null;
  entity_tags?: string[];
  menu_items: Array<{
    name: string;
    description?: string | null;
    category?: string | null;
    tags?: string[];
  }>;
}

export interface CoherenceResult {
  entity_menu_match_score: number;
  vertical_match_score: number;
  subcategory_match_score: number;
  keyword_match_score: number;
  taxonomy_match_score: number;
  title_match_score: number;
  status: "premium_confident" | "publishable" | "review_required" | "blocked";
  conflicts: string[];
  quarantine_reason: string | null;
  validation_summary: Record<string, any>;
}

/** Main coherence validation function */
export function validateEntityMenuCoherence(input: CoherenceInput): CoherenceResult {
  const { entity_name, entity_vertical, entity_subcategory, menu_items } = input;
  const conflicts: string[] = [];

  if (!menu_items.length) {
    return {
      entity_menu_match_score: 0,
      vertical_match_score: 0,
      subcategory_match_score: 0,
      keyword_match_score: 0,
      taxonomy_match_score: 0,
      title_match_score: 0,
      status: "review_required",
      conflicts: ["No menu items to validate"],
      quarantine_reason: "empty_menu",
      validation_summary: {},
    };
  }

  const verticalLower = entity_vertical?.toLowerCase() ?? "";
  const subcatLower = entity_subcategory?.toLowerCase() ?? "";

  // Collect all menu text for analysis
  const menuText = menu_items
    .map(i => `${i.name} ${i.description ?? ""} ${i.category ?? ""} ${(i.tags ?? []).join(" ")}`)
    .join(" ")
    .toLowerCase();

  // 1. Vertical match: check menu items contain vertical-relevant keywords
  const verticalKws = VERTICAL_KEYWORDS[verticalLower] ?? [];
  const verticalHits = verticalKws.filter(kw => menuText.includes(kw)).length;
  const vertical_match_score = verticalKws.length ? Math.min(100, Math.round((verticalHits / Math.min(verticalKws.length, 5)) * 100)) : 50;

  // 2. Subcategory match: check menu items match subcategory keywords
  const subcatKws = SUBCATEGORY_KEYWORDS[subcatLower] ?? [];
  const subcatHits = subcatKws.filter(kw => menuText.includes(kw)).length;
  const subcategory_match_score = subcatKws.length ? Math.min(100, Math.round((subcatHits / Math.min(subcatKws.length, 5)) * 100)) : 50;

  // 3. Cross-contamination detection
  const forbidden = FORBIDDEN_PAIRS[subcatLower] ?? [];
  let contaminationPenalty = 0;
  for (const forbiddenSub of forbidden) {
    const forbiddenKws = SUBCATEGORY_KEYWORDS[forbiddenSub] ?? [];
    const forbiddenHits = forbiddenKws.filter(kw => menuText.includes(kw)).length;
    if (forbiddenHits >= 3) {
      contaminationPenalty += 30;
      conflicts.push(`Cross-contamination: ${forbiddenHits} "${forbiddenSub}" keywords found in "${subcatLower}" entity`);
    } else if (forbiddenHits >= 1) {
      contaminationPenalty += 10;
    }
  }
  contaminationPenalty = Math.min(contaminationPenalty, 60);

  // 4. Title match: does entity name hint at the subcategory?
  const entityNameLower = entity_name.toLowerCase();
  const nameMatchesSubcat = subcatKws.some(kw => entityNameLower.includes(kw));
  const nameConflictWithMenu = forbidden.some(f => {
    const fKws = SUBCATEGORY_KEYWORDS[f] ?? [];
    return fKws.filter(kw => menuText.includes(kw)).length >= 3;
  });
  let title_match_score = nameMatchesSubcat ? 100 : 50;
  if (nameMatchesSubcat && nameConflictWithMenu) {
    title_match_score = 20;
    conflicts.push(`Entity name suggests "${subcatLower}" but menu contains conflicting items`);
  }

  // 5. Keyword density for expected subcategory
  const keyword_match_score = subcatKws.length
    ? Math.min(100, Math.round((subcatHits / subcatKws.length) * 150))
    : 50;

  // 6. Taxonomy match: category fields in menu items match entity vertical
  const menuCategories = [...new Set(menu_items.map(i => i.category?.toLowerCase()).filter(Boolean))] as string[];
  const taxonomyRelevant = menuCategories.filter(cat =>
    subcatKws.some(kw => cat.includes(kw)) || verticalKws.some(kw => cat.includes(kw))
  );
  const taxonomy_match_score = menuCategories.length
    ? Math.min(100, Math.round((taxonomyRelevant.length / menuCategories.length) * 100))
    : 50;

  // Global score
  const rawScore = Math.round(
    vertical_match_score * 0.15 +
    subcategory_match_score * 0.25 +
    keyword_match_score * 0.20 +
    taxonomy_match_score * 0.15 +
    title_match_score * 0.25
  );

  const entity_menu_match_score = Math.max(0, Math.min(100, rawScore - contaminationPenalty));

  // Determine status
  let status: CoherenceResult["status"];
  if (entity_menu_match_score >= 90) status = "premium_confident";
  else if (entity_menu_match_score >= 75) status = "publishable";
  else if (entity_menu_match_score >= 50) status = "review_required";
  else status = "blocked";

  let quarantine_reason: string | null = null;
  if (status === "blocked") {
    quarantine_reason = conflicts.length ? conflicts[0] : "Low coherence score";
  } else if (status === "review_required" && conflicts.length) {
    quarantine_reason = "menu_conflict";
  }

  return {
    entity_menu_match_score,
    vertical_match_score,
    subcategory_match_score,
    keyword_match_score,
    taxonomy_match_score,
    title_match_score,
    status,
    conflicts,
    quarantine_reason,
    validation_summary: {
      menuItemCount: menu_items.length,
      menuCategories,
      verticalHits,
      subcatHits,
      contaminationPenalty,
      forbiddenChecked: forbidden,
    },
  };
}

/** Quick check: should this template be allowed for this entity? */
export function isTemplateAllowedForEntity(
  entitySubcategory: string,
  templateType: string
): boolean {
  const subLower = entitySubcategory?.toLowerCase() ?? "";
  const templateLower = templateType?.toLowerCase() ?? "";

  // Same subcategory = always allowed
  if (subLower === templateLower) return true;

  // Check forbidden pairs
  const forbidden = FORBIDDEN_PAIRS[subLower] ?? [];
  if (forbidden.includes(templateLower)) return false;

  // Generic templates (no specific subcategory) are allowed
  if (!templateLower || templateLower === "generic" || templateLower === "default") return true;

  return true;
}

/** Get expected menu categories for a subcategory */
export function getExpectedMenuCategories(subcategory: string): string[] {
  const sub = subcategory?.toLowerCase() ?? "";
  const map: Record<string, string[]> = {
    sushi: ["sushi", "sashimi", "maki", "rolls", "sides", "drinks", "desserts"],
    pizza: ["pizza", "pasta", "sides", "drinks", "desserts"],
    burger: ["burgers", "sides", "drinks", "desserts"],
    shawarma: ["shawarma", "wraps", "sides", "drinks"],
    bakery: ["bread", "pastries", "cakes", "cookies", "drinks"],
    coffee: ["coffee", "tea", "pastries", "snacks", "drinks"],
    chinese: ["appetizers", "noodles", "rice", "mains", "soups", "drinks", "desserts"],
    indian: ["starters", "curry", "biryani", "bread", "sides", "drinks", "desserts"],
    mexican: ["tacos", "burritos", "sides", "drinks", "desserts"],
    seafood: ["fish", "shellfish", "grilled", "fried", "sides", "drinks"],
    fruits_vegetables: ["fruits", "vegetables", "herbs", "salads"],
    pharmacy: ["pain_relief", "vitamins", "hygiene", "skincare", "wellness"],
    ice_cream: ["ice_cream", "gelato", "sundaes", "drinks", "toppings"],
  };
  return map[sub] ?? ["mains", "sides", "drinks", "desserts"];
}
