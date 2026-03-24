/**
 * TAXONOMY INTELLIGENCE ENGINE
 * =============================
 * Auto-learning, fingerprint-based classification engine.
 * Extends classification-engine.ts — does NOT duplicate it.
 * 
 * Capabilities:
 * 1. Shop fingerprinting (name + menu + items + tags + patterns)
 * 2. Taxonomy gap detection (missing/wrong category/subcategory)
 * 3. Auto-correction with confidence scoring
 * 4. Learning loop (stores validated patterns for future matching)
 * 5. Hierarchical taxonomy suggestion (vertical > family > category > subcategory > sections)
 */

import { classifyBusiness, type ClassificationInput, type ClassificationResult } from "./classification-engine";
import {
  CANONICAL_VERTICALS,
  normalizeSubcategory,
  getParentVertical,
  type Vertical,
} from "./world-class-taxonomy";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

export interface TaxonomyFingerprint {
  name_tokens: string[];
  menu_tokens: string[];
  top_item_keywords: string[];
  price_range: { min: number; max: number } | null;
  item_count: number;
  category_signals: Record<string, number>; // subcategory → hit count
  brand_detected: string | null;
}

export interface TaxonomyIntelligenceInput {
  entity_id: string;
  name: string;
  description?: string | null;
  source_category?: string | null;
  source_subcategory?: string | null;
  tags?: string[];
  menu_items?: Array<{
    name: string;
    description?: string | null;
    category?: string | null;
    price?: number | null;
    tags?: string[];
  }>;
  current_vertical?: string | null;
  current_subcategory?: string | null;
}

export interface TaxonomyIntelligenceResult {
  detected_vertical: Vertical;
  detected_category: string | null;
  detected_subcategory: string | null;
  taxonomy_confidence_score: number;
  fingerprint: TaxonomyFingerprint;
  missing_taxonomy_detected: boolean;
  corrections_applied: string[];
  suggested_menu_sections: string[];
  gap_analysis: TaxonomyGap[];
  final_taxonomy_status: "confirmed" | "corrected" | "suggested" | "review_required" | "unknown";
  classification_result: ClassificationResult;
}

export interface TaxonomyGap {
  type: "missing_vertical" | "missing_category" | "missing_subcategory" | "wrong_vertical" | "wrong_subcategory" | "too_generic";
  current_value: string | null;
  suggested_value: string;
  confidence: number;
  reason: string;
}

// ═══════════════════════════════════════════════════════════
//  MENU SECTION TEMPLATES (expected sections per subcategory)
// ═══════════════════════════════════════════════════════════

const EXPECTED_SECTIONS: Record<string, string[]> = {
  sushi: ["Sushi", "Sashimi", "Maki Rolls", "Nigiri", "Hot Dishes", "Sides", "Drinks", "Desserts"],
  pizza: ["Pizzas", "Pasta", "Appetizers", "Salads", "Sides", "Drinks", "Desserts"],
  burger: ["Burgers", "Chicken", "Fries & Sides", "Drinks", "Desserts"],
  shawarma: ["Shawarma", "Wraps", "Plates", "Sides", "Drinks"],
  chinese: ["Appetizers", "Noodles", "Rice Dishes", "Mains", "Dim Sum", "Soups", "Drinks"],
  indian: ["Starters", "Curry", "Biryani", "Tandoori", "Bread", "Sides", "Drinks", "Desserts"],
  mexican: ["Tacos", "Burritos", "Quesadillas", "Nachos", "Sides", "Drinks"],
  italian: ["Pasta", "Pizza", "Risotto", "Appetizers", "Salads", "Drinks", "Desserts"],
  bakery: ["Bread", "Pastries", "Cakes", "Cookies", "Drinks"],
  cafe: ["Coffee", "Tea", "Smoothies", "Pastries", "Sandwiches", "Salads"],
  desserts: ["Cakes", "Pastries", "Ice Cream", "Drinks"],
  healthy: ["Bowls", "Salads", "Wraps", "Smoothies", "Juices", "Snacks"],
  seafood: ["Fish", "Shellfish", "Grilled", "Fried", "Sides", "Drinks"],
  thai: ["Starters", "Curry", "Stir Fry", "Noodles", "Rice", "Soups", "Drinks"],
  lebanese: ["Mezzeh", "Grills", "Wraps", "Salads", "Sides", "Drinks"],
  japanese: ["Sushi", "Sashimi", "Ramen", "Tempura", "Appetizers", "Drinks"],
  breakfast: ["Eggs", "Pancakes", "Sandwiches", "Smoothies", "Coffee", "Juice"],
  fried_chicken: ["Chicken", "Tenders", "Sides", "Drinks", "Desserts"],
  pasta: ["Pasta", "Appetizers", "Salads", "Drinks", "Desserts"],
  korean: ["BBQ", "Bibimbap", "Noodles", "Starters", "Sides", "Drinks"],
  // Non-food
  supermarket: ["Fresh Produce", "Dairy", "Meat", "Bakery", "Beverages", "Snacks", "Household"],
  mini_mart: ["Snacks", "Beverages", "Essentials", "Personal Care"],
  organic_store: ["Fruits", "Vegetables", "Grains", "Dairy", "Beverages", "Supplements"],
  pharmacy: ["Pain Relief", "Vitamins", "Skin Care", "Personal Care", "Hygiene"],
  salon: ["Haircut", "Coloring", "Styling", "Treatments"],
  spa: ["Massage", "Facial", "Body Care", "Packages"],
};

// ═══════════════════════════════════════════════════════════
//  ITEM-LEVEL KEYWORD FINGERPRINTING
// ═══════════════════════════════════════════════════════════

const SUBCATEGORY_ITEM_PATTERNS: Record<string, RegExp[]> = {
  sushi: [/sushi/i, /maki/i, /nigiri/i, /sashimi/i, /roll/i, /tempura/i, /edamame/i, /wasabi/i],
  pizza: [/pizza/i, /margherita/i, /pepperoni/i, /calzone/i, /four cheese/i, /hawaiian/i],
  burger: [/burger/i, /cheeseburger/i, /patty/i, /bun/i, /fries/i, /onion ring/i],
  shawarma: [/shawarma/i, /kebab/i, /falafel/i, /hummus/i, /wrap/i, /pita/i, /fattoush/i],
  chinese: [/dim sum/i, /dumpling/i, /wok/i, /fried rice/i, /spring roll/i, /chow mein/i, /kung pao/i],
  indian: [/curry/i, /naan/i, /biryani/i, /tandoori/i, /tikka/i, /samosa/i, /dal/i, /paneer/i],
  mexican: [/taco/i, /burrito/i, /quesadilla/i, /nacho/i, /guacamole/i, /enchilada/i],
  bakery: [/bread/i, /croissant/i, /baguette/i, /pain/i, /pastry/i, /éclair/i, /macaron/i],
  cafe: [/espresso/i, /latte/i, /cappuccino/i, /americano/i, /mocha/i, /cold brew/i],
  seafood: [/salmon/i, /shrimp/i, /lobster/i, /crab/i, /fish/i, /calamari/i, /prawn/i],
  thai: [/pad thai/i, /tom yum/i, /green curry/i, /satay/i, /thai/i, /coconut/i],
  lebanese: [/tabbouleh/i, /fattoush/i, /kibbeh/i, /kafta/i, /labneh/i, /manakish/i],
  korean: [/bibimbap/i, /kimchi/i, /bulgogi/i, /tteokbokki/i, /korean/i],
  healthy: [/bowl/i, /acai/i, /quinoa/i, /smoothie/i, /protein/i, /avocado/i, /salad/i],
  desserts: [/cake/i, /gelato/i, /ice cream/i, /cheesecake/i, /brownie/i, /tiramisu/i, /waffle/i],
  fried_chicken: [/fried chicken/i, /crispy/i, /tenders/i, /wings/i, /drumstick/i],
  breakfast: [/pancake/i, /waffle/i, /omelette/i, /eggs benedict/i, /french toast/i, /cereal/i],
  fruits_vegetables: [/apple/i, /banana/i, /orange/i, /tomato/i, /avocado/i, /mango/i, /lettuce/i],
};

// ═══════════════════════════════════════════════════════════
//  FINGERPRINT BUILDER
// ═══════════════════════════════════════════════════════════

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(t => t.length > 2);
}

export function buildFingerprint(input: TaxonomyIntelligenceInput): TaxonomyFingerprint {
  const nameTokens = tokenize(input.name);
  const menuTokens: string[] = [];
  const prices: number[] = [];
  const categorySignals: Record<string, number> = {};

  for (const item of input.menu_items ?? []) {
    const itemTokens = tokenize(`${item.name} ${item.description ?? ""}`);
    menuTokens.push(...itemTokens);
    if (item.price != null && item.price > 0) prices.push(item.price);

    // Match item against subcategory patterns
    const itemText = `${item.name} ${item.description ?? ""}`;
    for (const [sub, patterns] of Object.entries(SUBCATEGORY_ITEM_PATTERNS)) {
      const hits = patterns.filter(p => p.test(itemText)).length;
      if (hits > 0) {
        categorySignals[sub] = (categorySignals[sub] ?? 0) + hits;
      }
    }
  }

  // Top keywords by frequency
  const freq: Record<string, number> = {};
  for (const t of menuTokens) {
    freq[t] = (freq[t] ?? 0) + 1;
  }
  const topKeywords = Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([k]) => k);

  return {
    name_tokens: nameTokens,
    menu_tokens: [...new Set(menuTokens)].slice(0, 100),
    top_item_keywords: topKeywords,
    price_range: prices.length ? { min: Math.min(...prices), max: Math.max(...prices) } : null,
    item_count: input.menu_items?.length ?? 0,
    category_signals: categorySignals,
    brand_detected: null,
  };
}

// ═══════════════════════════════════════════════════════════
//  GAP DETECTION
// ═══════════════════════════════════════════════════════════

function detectGaps(
  input: TaxonomyIntelligenceInput,
  classification: ClassificationResult,
  fingerprint: TaxonomyFingerprint
): TaxonomyGap[] {
  const gaps: TaxonomyGap[] = [];

  // 1. Missing vertical
  if (!input.current_vertical) {
    gaps.push({
      type: "missing_vertical",
      current_value: null,
      suggested_value: classification.canonical_vertical,
      confidence: classification.confidence_score,
      reason: "No vertical assigned",
    });
  }

  // 2. Wrong vertical (classification disagrees with current)
  if (input.current_vertical && input.current_vertical !== classification.canonical_vertical && classification.confidence_score >= 70) {
    gaps.push({
      type: "wrong_vertical",
      current_value: input.current_vertical,
      suggested_value: classification.canonical_vertical,
      confidence: classification.confidence_score,
      reason: `Classification suggests ${classification.canonical_vertical} (score: ${classification.confidence_score})`,
    });
  }

  // 3. Missing subcategory
  if (!input.current_subcategory && classification.canonical_subcategory) {
    gaps.push({
      type: "missing_subcategory",
      current_value: null,
      suggested_value: classification.canonical_subcategory,
      confidence: classification.confidence_score,
      reason: "No subcategory assigned",
    });
  }

  // 4. Wrong subcategory (fingerprint disagrees)
  if (input.current_subcategory && Object.keys(fingerprint.category_signals).length > 0) {
    const topSignal = Object.entries(fingerprint.category_signals)
      .sort((a, b) => b[1] - a[1])[0];

    if (topSignal && topSignal[0] !== input.current_subcategory && topSignal[1] >= 5) {
      gaps.push({
        type: "wrong_subcategory",
        current_value: input.current_subcategory,
        suggested_value: topSignal[0],
        confidence: Math.min(95, 50 + topSignal[1] * 5),
        reason: `Menu fingerprint strongly suggests "${topSignal[0]}" (${topSignal[1]} keyword hits)`,
      });
    }
  }

  // 5. Too generic (has vertical but subcategory is too broad)
  if (input.current_subcategory && ["restaurant", "food", "store", "shop", "service"].includes(input.current_subcategory.toLowerCase())) {
    const bestSub = classification.canonical_subcategory;
    if (bestSub) {
      gaps.push({
        type: "too_generic",
        current_value: input.current_subcategory,
        suggested_value: bestSub,
        confidence: classification.confidence_score,
        reason: `"${input.current_subcategory}" is too generic, suggesting "${bestSub}"`,
      });
    }
  }

  return gaps;
}

// ═══════════════════════════════════════════════════════════
//  LEARNING STORE (in-memory for now, DB-backed later)
// ═══════════════════════════════════════════════════════════

interface LearnedPattern {
  fingerprint_hash: string;
  vertical: Vertical;
  subcategory: string;
  confidence: number;
  validated_by: "admin" | "merchant" | "auto_high_confidence" | "usage";
  created_at: string;
}

const learnedPatterns: Map<string, LearnedPattern> = new Map();

function fingerprintHash(fp: TaxonomyFingerprint): string {
  const signals = Object.entries(fp.category_signals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
  return `${fp.name_tokens.slice(0, 3).join("-")}::${signals}::items=${fp.item_count}`;
}

export function learnFromValidation(
  fingerprint: TaxonomyFingerprint,
  vertical: Vertical,
  subcategory: string,
  validatedBy: LearnedPattern["validated_by"]
): void {
  const hash = fingerprintHash(fingerprint);
  learnedPatterns.set(hash, {
    fingerprint_hash: hash,
    vertical,
    subcategory,
    confidence: 90,
    validated_by: validatedBy,
    created_at: new Date().toISOString(),
  });
}

function checkLearnedPatterns(fp: TaxonomyFingerprint): LearnedPattern | null {
  const hash = fingerprintHash(fp);
  return learnedPatterns.get(hash) ?? null;
}

// ═══════════════════════════════════════════════════════════
//  MAIN ENGINE
// ═══════════════════════════════════════════════════════════

export function analyzeTaxonomy(input: TaxonomyIntelligenceInput): TaxonomyIntelligenceResult {
  // 1. Build fingerprint
  const fingerprint = buildFingerprint(input);

  // 2. Check learned patterns first
  const learned = checkLearnedPatterns(fingerprint);

  // 3. Run classification engine
  const classInput: ClassificationInput = {
    businessName: input.name,
    sourceCategory: input.source_category,
    sourceSubcategory: input.source_subcategory,
    description: input.description,
    menuText: input.menu_items?.map(i => `${i.name} ${i.description ?? ""}`).join(" "),
    products: input.menu_items?.map(i => i.name),
    tags: input.tags,
  };
  const classification = classifyBusiness(classInput);

  // 4. Override with learned if available and high confidence
  let detectedVertical = classification.canonical_vertical;
  let detectedSubcategory = classification.canonical_subcategory;
  let confidence = classification.confidence_score;

  if (learned && learned.confidence >= 85) {
    detectedVertical = learned.vertical;
    detectedSubcategory = learned.subcategory;
    confidence = Math.max(confidence, learned.confidence);
  }

  // 5. Fingerprint-based subcategory refinement
  const topSignals = Object.entries(fingerprint.category_signals)
    .sort((a, b) => b[1] - a[1]);

  if (topSignals.length > 0 && topSignals[0][1] >= 3) {
    const fingerprintSub = topSignals[0][0];
    // If fingerprint strongly disagrees with classification, prefer fingerprint for food
    if (detectedVertical === "food" && fingerprintSub !== detectedSubcategory && topSignals[0][1] >= 5) {
      detectedSubcategory = fingerprintSub;
      confidence = Math.min(95, 60 + topSignals[0][1] * 3);
    } else if (!detectedSubcategory) {
      detectedSubcategory = fingerprintSub;
    }
  }

  // 6. Detect gaps
  const gaps = detectGaps(input, classification, fingerprint);
  const corrections: string[] = [];

  // 7. Apply auto-corrections
  if (gaps.length > 0) {
    for (const gap of gaps) {
      if (gap.confidence >= 80) {
        corrections.push(`${gap.type}: ${gap.current_value ?? "null"} → ${gap.suggested_value} (confidence: ${gap.confidence})`);
      }
    }
  }

  // 8. Determine menu sections
  const subKey = (detectedSubcategory ?? "").toLowerCase();
  const suggestedSections = EXPECTED_SECTIONS[subKey] ?? ["Mains", "Sides", "Drinks", "Desserts"];

  // 9. Determine status
  let status: TaxonomyIntelligenceResult["final_taxonomy_status"];
  if (input.current_vertical === detectedVertical && input.current_subcategory === detectedSubcategory) {
    status = "confirmed";
  } else if (corrections.length > 0 && confidence >= 80) {
    status = "corrected";
  } else if (confidence >= 60) {
    status = "suggested";
  } else if (confidence >= 40) {
    status = "review_required";
  } else {
    status = "unknown";
  }

  // 10. Auto-learn if high confidence
  if (confidence >= 90 && detectedSubcategory) {
    learnFromValidation(fingerprint, detectedVertical, detectedSubcategory, "auto_high_confidence");
  }

  // Determine category from vertical
  const detectedCategory = detectedVertical;

  return {
    detected_vertical: detectedVertical,
    detected_category: detectedCategory,
    detected_subcategory: detectedSubcategory,
    taxonomy_confidence_score: confidence,
    fingerprint,
    missing_taxonomy_detected: gaps.length > 0,
    corrections_applied: corrections,
    suggested_menu_sections: suggestedSections,
    gap_analysis: gaps,
    final_taxonomy_status: status,
    classification_result: classification,
  };
}

// ═══════════════════════════════════════════════════════════
//  BATCH ANALYSIS
// ═══════════════════════════════════════════════════════════

export interface BatchTaxonomyReport {
  total: number;
  confirmed: number;
  corrected: number;
  suggested: number;
  review_required: number;
  unknown: number;
  gaps_detected: number;
  corrections_count: number;
  results: TaxonomyIntelligenceResult[];
}

export function analyzeBatchTaxonomy(inputs: TaxonomyIntelligenceInput[]): BatchTaxonomyReport {
  const results = inputs.map(i => analyzeTaxonomy(i));

  return {
    total: results.length,
    confirmed: results.filter(r => r.final_taxonomy_status === "confirmed").length,
    corrected: results.filter(r => r.final_taxonomy_status === "corrected").length,
    suggested: results.filter(r => r.final_taxonomy_status === "suggested").length,
    review_required: results.filter(r => r.final_taxonomy_status === "review_required").length,
    unknown: results.filter(r => r.final_taxonomy_status === "unknown").length,
    gaps_detected: results.filter(r => r.missing_taxonomy_detected).length,
    corrections_count: results.reduce((sum, r) => sum + r.corrections_applied.length, 0),
    results,
  };
}

// ═══════════════════════════════════════════════════════════
//  LEARNING STATS (for admin)
// ═══════════════════════════════════════════════════════════

export function getLearningStats() {
  return {
    total_patterns: learnedPatterns.size,
    by_source: {
      admin: [...learnedPatterns.values()].filter(p => p.validated_by === "admin").length,
      merchant: [...learnedPatterns.values()].filter(p => p.validated_by === "merchant").length,
      auto: [...learnedPatterns.values()].filter(p => p.validated_by === "auto_high_confidence").length,
      usage: [...learnedPatterns.values()].filter(p => p.validated_by === "usage").length,
    },
    patterns: [...learnedPatterns.values()].slice(0, 50),
  };
}
