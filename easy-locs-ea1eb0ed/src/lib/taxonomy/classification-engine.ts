/**
 * INTELLIGENT GLOBAL CLASSIFICATION ENGINE
 * ==========================================
 * Multi-layer classifier: Rules → Scoring → Confidence → Learning
 * Replaces basic fallback-to-services logic.
 */
import type { Vertical } from "@/lib/taxonomy/world-class-taxonomy";
import { CANONICAL_VERTICALS } from "@/lib/taxonomy/world-class-taxonomy";
import { normalizeSubcategory, getParentVertical } from "./taxonomy-aliases";

// ═══════════════════════════════════════════════════════════
//  TYPES
// ═══════════════════════════════════════════════════════════

export interface ClassificationInput {
  businessName: string;
  sourceCategory?: string | null;
  sourceSubcategory?: string | null;
  description?: string | null;
  menuText?: string | null;
  products?: string[] | null;
  tags?: string[] | null;
  websiteText?: string | null;
  instagramBio?: string | null;
  address?: string | null;
  sourceType?: string | null;
}

export interface ClassificationResult {
  canonical_vertical: Vertical;
  canonical_cluster: string | null;
  canonical_subcategory: string | null;
  confidence_score: number;            // 0–100
  classification_reason: string;
  source_signals_used: string[];
  requires_review: boolean;
  classification_version: string;
  layer_scores: Record<Vertical, number>;
}

// ═══════════════════════════════════════════════════════════
//  LAYER A — BRAND DICTIONARY (deterministic override)
// ═══════════════════════════════════════════════════════════

interface BrandEntry {
  vertical: Vertical;
  subcategory?: string;
  confidence: number;
}

const BRAND_DICTIONARY: Record<string, BrandEntry> = {
  // Grocery
  carrefour:  { vertical: "grocery", subcategory: "supermarket", confidence: 98 },
  lulu:       { vertical: "grocery", subcategory: "supermarket", confidence: 98 },
  "lulu hypermarket": { vertical: "grocery", subcategory: "supermarket", confidence: 99 },
  choithrams: { vertical: "grocery", subcategory: "supermarket", confidence: 97 },
  grandiose:  { vertical: "grocery", subcategory: "supermarket", confidence: 95 },
  kibsons:    { vertical: "grocery", subcategory: "organic_store", confidence: 95 },
  "al maya":  { vertical: "grocery", subcategory: "supermarket", confidence: 95 },
  spinneys:   { vertical: "grocery", subcategory: "supermarket", confidence: 97 },
  "organic foods": { vertical: "grocery", subcategory: "organic_store", confidence: 95 },
  waitrose:   { vertical: "grocery", subcategory: "supermarket", confidence: 97 },

  // Shops
  ikea:         { vertical: "shops", subcategory: "home_decor", confidence: 99 },
  "home centre": { vertical: "shops", subcategory: "home_decor", confidence: 97 },
  "ace hardware": { vertical: "shops", subcategory: "electronics", confidence: 95 },
  daiso:        { vertical: "shops", subcategory: "gifts", confidence: 90 },
  sephora:      { vertical: "shops", subcategory: "accessories", confidence: 95 },
  "paris gallery": { vertical: "shops", subcategory: "accessories", confidence: 93 },
  ounass:       { vertical: "shops", subcategory: "fashion", confidence: 95 },
  "bath & body works": { vertical: "shops", subcategory: "accessories", confidence: 93 },
  zara:         { vertical: "shops", subcategory: "fashion", confidence: 97 },
  "h&m":        { vertical: "shops", subcategory: "fashion", confidence: 97 },

  // Food — major chains
  starbucks:    { vertical: "food", subcategory: "cafe", confidence: 99 },
  "costa coffee": { vertical: "food", subcategory: "cafe", confidence: 98 },
  mcdonalds:    { vertical: "food", subcategory: "fast_food", confidence: 99 },
  "shake shack": { vertical: "food", subcategory: "burger", confidence: 97 },
  "five guys":  { vertical: "food", subcategory: "burger", confidence: 97 },
  kfc:          { vertical: "food", subcategory: "fried_chicken", confidence: 99 },
  "popeyes":    { vertical: "food", subcategory: "fried_chicken", confidence: 97 },
  jollibee:     { vertical: "food", subcategory: "fast_food", confidence: 95 },
  hardees:      { vertical: "food", subcategory: "fast_food", confidence: 95 },
  subway:       { vertical: "food", subcategory: "fast_food", confidence: 97 },
  nobu:         { vertical: "food", subcategory: "japanese", confidence: 98 },
  "din tai fung": { vertical: "food", subcategory: "chinese", confidence: 97 },
  "tim hortons": { vertical: "food", subcategory: "cafe", confidence: 97 },
  "paul bakery": { vertical: "food", subcategory: "bakery", confidence: 97 },

  "pizza hut":  { vertical: "food", subcategory: "pizza", confidence: 99 },
  "dominos":    { vertical: "food", subcategory: "pizza", confidence: 99 },
  "papa johns": { vertical: "food", subcategory: "pizza", confidence: 97 },
  "burger king": { vertical: "food", subcategory: "burger", confidence: 99 },
  "al baik":    { vertical: "food", subcategory: "fried_chicken", confidence: 97 },
  chilis:       { vertical: "food", subcategory: "restaurant", confidence: 95 },
  applebees:    { vertical: "food", subcategory: "restaurant", confidence: 95 },
  "the cheesecake factory": { vertical: "food", subcategory: "restaurant", confidence: 97 },
  nandos:       { vertical: "food", subcategory: "restaurant", confidence: 96 },
  "pf changs":  { vertical: "food", subcategory: "chinese", confidence: 95 },
  wagamama:     { vertical: "food", subcategory: "asian", confidence: 95 },
  "texas roadhouse": { vertical: "food", subcategory: "restaurant", confidence: 95 },
  "salt bae":   { vertical: "food", subcategory: "fine_dining", confidence: 95 },
  "nusr-et":    { vertical: "food", subcategory: "fine_dining", confidence: 96 },
  "baskin robbins": { vertical: "food", subcategory: "desserts", confidence: 97 },
  "cold stone":  { vertical: "food", subcategory: "desserts", confidence: 95 },
  "krispy kreme": { vertical: "food", subcategory: "bakery", confidence: 97 },
  "dunkin donuts": { vertical: "food", subcategory: "bakery", confidence: 97 },
  "pret a manger": { vertical: "food", subcategory: "cafe", confidence: 95 },
  "caribou coffee": { vertical: "food", subcategory: "coffee", confidence: 96 },

  // Stay
  marriott:     { vertical: "stay", subcategory: "hotel", confidence: 99 },
  hilton:       { vertical: "stay", subcategory: "hotel", confidence: 99 },
  hyatt:        { vertical: "stay", subcategory: "hotel", confidence: 99 },
  "four seasons": { vertical: "stay", subcategory: "boutique", confidence: 98 },
  "ritz carlton": { vertical: "stay", subcategory: "boutique", confidence: 98 },
  "w hotel":    { vertical: "stay", subcategory: "boutique", confidence: 97 },
  rotana:       { vertical: "stay", subcategory: "hotel", confidence: 97 },
  "jumeirah":   { vertical: "stay", subcategory: "hotel", confidence: 98 },
  "premier inn": { vertical: "stay", subcategory: "hotel", confidence: 96 },
  ibis:         { vertical: "stay", subcategory: "hotel", confidence: 95 },
  airbnb:       { vertical: "stay", subcategory: "holiday_rental", confidence: 95 },

  // Mobility
  uber:         { vertical: "mobility", subcategory: "taxi", confidence: 99 },
  careem:       { vertical: "mobility", subcategory: "taxi", confidence: 99 },
  bolt:         { vertical: "mobility", subcategory: "taxi", confidence: 97 },
  hertz:        { vertical: "mobility", subcategory: "car_rental", confidence: 97 },
  avis:         { vertical: "mobility", subcategory: "car_rental", confidence: 97 },
  sixt:         { vertical: "mobility", subcategory: "car_rental", confidence: 95 },

  // Property
  emaar:        { vertical: "property", subcategory: "developer_project", confidence: 98 },
  damac:        { vertical: "property", subcategory: "developer_project", confidence: 98 },
  nakheel:      { vertical: "property", subcategory: "developer_project", confidence: 97 },
  meraas:       { vertical: "property", subcategory: "developer_project", confidence: 97 },
  sobha:        { vertical: "property", subcategory: "developer_project", confidence: 95 },
  "azizi developments": { vertical: "property", subcategory: "developer_project", confidence: 95 },

  // Healthcare
  aster:        { vertical: "healthcare", subcategory: "clinic", confidence: 95 },
  mediclinic:   { vertical: "healthcare", subcategory: "clinic", confidence: 95 },
  "nmc health": { vertical: "healthcare", subcategory: "clinic", confidence: 95 },
  "asters pharmacy": { vertical: "healthcare", subcategory: "pharmacy", confidence: 95 },
  "life pharmacy": { vertical: "healthcare", subcategory: "pharmacy", confidence: 96 },
  "boots pharmacy": { vertical: "healthcare", subcategory: "pharmacy", confidence: 96 },
};

function matchBrand(name: string): BrandEntry | null {
  const normalized = name.toLowerCase().trim();
  // Exact match
  if (BRAND_DICTIONARY[normalized]) return BRAND_DICTIONARY[normalized];
  // Partial match — brand appears in name
  for (const [brand, entry] of Object.entries(BRAND_DICTIONARY)) {
    if (normalized.includes(brand)) return { ...entry, confidence: entry.confidence - 3 };
  }
  return null;
}

// ═══════════════════════════════════════════════════════════
//  LAYER A — KEYWORD RULES (deterministic)
// ═══════════════════════════════════════════════════════════

interface KeywordRule {
  keywords: string[];
  vertical: Vertical;
  subcategory?: string;
  weight: number;  // 1–10
}

const KEYWORD_RULES: KeywordRule[] = [
  // Property — strongest signals
  { keywords: ["rent", "for rent", "rental", "lease", "tenancy"], vertical: "property", weight: 10 },
  { keywords: ["sale", "for sale", "buy", "purchase"], vertical: "property", weight: 10 },
  { keywords: ["apartment", "villa", "studio apartment", "penthouse", "townhouse", "duplex", "loft"], vertical: "property", weight: 9 },
  { keywords: ["bedroom", "1br", "2br", "3br", "4br", "5br", "1 br", "2 br", "3 br"], vertical: "property", weight: 9 },
  { keywords: ["sqft", "sq ft", "sqm", "sq m"], vertical: "property", weight: 8 },
  { keywords: ["real estate", "property management"], vertical: "property", weight: 10 },

  // Grocery — strong signals
  { keywords: ["supermarket", "hypermarket", "grocery", "grocer"], vertical: "grocery", subcategory: "supermarket", weight: 10 },
  { keywords: ["fresh produce", "fruits", "vegetables", "butcher", "dairy"], vertical: "grocery", weight: 8 },
  { keywords: ["organic store", "health food store"], vertical: "grocery", subcategory: "organic_store", weight: 9 },

  // Food — strong signals
  { keywords: ["restaurant", "ristorante", "bistro", "brasserie", "trattoria"], vertical: "food", subcategory: "restaurant", weight: 9 },
  { keywords: ["cafe", "coffee shop", "coffeehouse", "caffè"], vertical: "food", subcategory: "cafe", weight: 9 },
  { keywords: ["pizza", "pizzeria"], vertical: "food", subcategory: "pizza", weight: 9 },
  { keywords: ["burger", "burgers"], vertical: "food", subcategory: "burger", weight: 9 },
  { keywords: ["sushi", "sashimi"], vertical: "food", subcategory: "sushi", weight: 9 },
  { keywords: ["bakery", "boulangerie", "patisserie"], vertical: "food", subcategory: "bakery", weight: 9 },
  { keywords: ["shawarma", "falafel", "kebab"], vertical: "food", subcategory: "shawarma", weight: 9 },
  { keywords: ["dessert", "ice cream", "gelato", "sweets", "chocolate"], vertical: "food", subcategory: "desserts", weight: 8 },
  { keywords: ["menu", "dine", "dining", "takeaway", "takeout", "eat", "food"], vertical: "food", weight: 6 },

  // Shops — strong signals
  { keywords: ["furniture", "furnishing", "home centre"], vertical: "shops", subcategory: "home_decor", weight: 9 },
  { keywords: ["electronics", "gadgets", "appliances"], vertical: "shops", subcategory: "electronics", weight: 9 },
  { keywords: ["fashion", "clothing", "apparel", "boutique"], vertical: "shops", subcategory: "fashion", weight: 8 },
  { keywords: ["hardware", "tools", "diy"], vertical: "shops", weight: 8 },
  { keywords: ["variety store", "general store"], vertical: "shops", weight: 7 },
  { keywords: ["luxury", "perfume", "fragrance", "cosmetics"], vertical: "shops", subcategory: "accessories", weight: 7 },
  { keywords: ["pet shop", "pet store", "pet zone"], vertical: "shops", subcategory: "pets", weight: 9 },
  { keywords: ["flower", "florist", "bouquet"], vertical: "shops", subcategory: "flowers", weight: 9 },

  // Services
  { keywords: ["cleaning", "maid", "deep clean"], vertical: "services", subcategory: "cleaning", weight: 9 },
  { keywords: ["plumbing", "plumber"], vertical: "services", subcategory: "plumbing", weight: 10 },
  { keywords: ["electrical", "electrician"], vertical: "services", subcategory: "electrical", weight: 10 },
  { keywords: ["ac repair", "ac maintenance", "hvac"], vertical: "services", subcategory: "ac_repair", weight: 10 },
  { keywords: ["car wash", "auto wash"], vertical: "services", subcategory: "car_wash", weight: 10 },
  { keywords: ["salon", "hair salon", "barber", "barbershop"], vertical: "services", subcategory: "salon", weight: 9 },
  { keywords: ["spa", "massage", "wellness"], vertical: "services", subcategory: "spa", weight: 8 },
  { keywords: ["tailor", "tailoring", "alteration"], vertical: "services", subcategory: "tailoring", weight: 9 },
  { keywords: ["moving", "movers", "relocation"], vertical: "services", subcategory: "movers", weight: 9 },
  { keywords: ["painting", "painter", "wall painting"], vertical: "services", subcategory: "handyman", weight: 8 },
  { keywords: ["legal", "lawyer", "law firm", "attorney"], vertical: "services", subcategory: "legal", weight: 10 },
  { keywords: ["photography", "photographer", "photo studio"], vertical: "services", weight: 8 },
  { keywords: ["landscaping", "garden", "gardener"], vertical: "services", weight: 8 },
  { keywords: ["pest control", "exterminator"], vertical: "services", subcategory: "pest_control", weight: 10 },
  { keywords: ["repair", "fix", "tech repair"], vertical: "services", weight: 6 },

  // Healthcare
  { keywords: ["clinic", "medical", "doctor", "physician"], vertical: "healthcare", subcategory: "clinic", weight: 10 },
  { keywords: ["dentist", "dental"], vertical: "healthcare", subcategory: "dentist", weight: 10 },
  { keywords: ["pharmacy"], vertical: "shops", subcategory: "pharmacy", weight: 8 },
  { keywords: ["physiotherapy", "physio", "rehab"], vertical: "healthcare", subcategory: "physio", weight: 9 },

  // Mobility
  { keywords: ["taxi", "cab", "ride"], vertical: "mobility", subcategory: "taxi", weight: 8 },
  { keywords: ["car rental", "rent a car"], vertical: "mobility", subcategory: "car_rental", weight: 9 },
  { keywords: ["chauffeur", "limousine", "limo"], vertical: "mobility", subcategory: "chauffeur", weight: 9 },

  // Experiences
  { keywords: ["tour", "excursion", "safari", "cruise"], vertical: "experiences", subcategory: "activities", weight: 9 },
  { keywords: ["event", "concert", "festival", "show"], vertical: "experiences", subcategory: "events", weight: 8 },
  { keywords: ["ticket", "booking attraction"], vertical: "experiences", subcategory: "tickets", weight: 7 },
  { keywords: ["gym", "fitness", "crossfit", "yoga"], vertical: "experiences", subcategory: "activities", weight: 7 },
];

// ═══════════════════════════════════════════════════════════
//  SIGNAL WEIGHTS
// ═══════════════════════════════════════════════════════════

const SIGNAL_WEIGHTS: Record<string, number> = {
  brand_match:       30,
  subcategory_match: 25,
  name_keyword:      20,
  menu_text:         25,
  description:       15,
  products:          18,
  tags:              12,
  source_category:   10,
  website_text:       8,
  instagram_bio:      6,
  address:            3,
};

// ═══════════════════════════════════════════════════════════
//  SCORING ENGINE
// ═══════════════════════════════════════════════════════════

interface ScoringAccumulator {
  scores: Record<Vertical, number>;
  signals: string[];
  reasons: string[];
  bestSubcategory: string | null;
  bestCluster: string | null;
}

function createAccumulator(): ScoringAccumulator {
  return {
    scores: { food: 0, grocery: 0, shops: 0, services: 0, property: 0, healthcare: 0, mobility: 0, experiences: 0 },
    signals: [],
    reasons: [],
    bestSubcategory: null,
    bestCluster: null,
  };
}

function addScore(acc: ScoringAccumulator, vertical: Vertical, points: number, signal: string, reason: string) {
  acc.scores[vertical] += points;
  if (!acc.signals.includes(signal)) acc.signals.push(signal);
  acc.reasons.push(reason);
}

function textContainsKeyword(text: string, keyword: string): boolean {
  const normalized = text.toLowerCase();
  return normalized.includes(keyword.toLowerCase());
}

function scoreText(acc: ScoringAccumulator, text: string, signalName: string, weight: number) {
  for (const rule of KEYWORD_RULES) {
    for (const kw of rule.keywords) {
      if (textContainsKeyword(text, kw)) {
        const points = (rule.weight / 10) * weight;
        addScore(acc, rule.vertical, points, signalName, `"${kw}" found in ${signalName}`);
        if (rule.subcategory && !acc.bestSubcategory) {
          acc.bestSubcategory = rule.subcategory;
        }
        break; // one match per rule is enough
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════
//  MAIN CLASSIFIER
// ═══════════════════════════════════════════════════════════

const ENGINE_VERSION = "1.0.0";

export function classifyBusiness(input: ClassificationInput): ClassificationResult {
  const acc = createAccumulator();

  // ── LAYER A: Brand dictionary (highest priority) ──
  const brand = matchBrand(input.businessName);
  if (brand) {
    addScore(acc, brand.vertical, SIGNAL_WEIGHTS.brand_match, "brand_match", `Brand "${input.businessName}" → ${brand.vertical}`);
    if (brand.subcategory) acc.bestSubcategory = brand.subcategory;
  }

  // ── LAYER A: Canonical subcategory lookup ──
  if (input.sourceSubcategory) {
    const normalized = normalizeSubcategory(input.sourceSubcategory);
    if (normalized) {
      const parent = getParentVertical(normalized);
      if (parent) {
        addScore(acc, parent.value as Vertical, SIGNAL_WEIGHTS.subcategory_match, "subcategory_match",
          `Subcategory "${input.sourceSubcategory}" → ${parent.value}`);
        if (!acc.bestSubcategory) acc.bestSubcategory = normalized;
      }
    }
    // Also score as text
    scoreText(acc, input.sourceSubcategory, "subcategory_match", SIGNAL_WEIGHTS.subcategory_match * 0.3);
  }

  // ── LAYER B: Business name keywords ──
  scoreText(acc, input.businessName, "name_keyword", SIGNAL_WEIGHTS.name_keyword);

  // ── LAYER B: Source category ──
  if (input.sourceCategory) {
    scoreText(acc, input.sourceCategory, "source_category", SIGNAL_WEIGHTS.source_category);
  }

  // ── LAYER B: Description ──
  if (input.description) {
    scoreText(acc, input.description, "description", SIGNAL_WEIGHTS.description);
  }

  // ── LAYER B: Menu text (very strong food signal) ──
  if (input.menuText) {
    // Menu presence is itself a strong food signal
    addScore(acc, "food", SIGNAL_WEIGHTS.menu_text * 0.7, "menu_text", "Menu text present → food signal");
    scoreText(acc, input.menuText, "menu_text", SIGNAL_WEIGHTS.menu_text);
  }

  // ── LAYER B: Products ──
  if (input.products?.length) {
    const productText = input.products.join(" ");
    scoreText(acc, productText, "products", SIGNAL_WEIGHTS.products);
  }

  // ── LAYER B: Tags ──
  if (input.tags?.length) {
    const tagText = input.tags.join(" ");
    scoreText(acc, tagText, "tags", SIGNAL_WEIGHTS.tags);
  }

  // ── LAYER B: Website / Instagram ──
  if (input.websiteText) {
    scoreText(acc, input.websiteText, "website_text", SIGNAL_WEIGHTS.website_text);
  }
  if (input.instagramBio) {
    scoreText(acc, input.instagramBio, "instagram_bio", SIGNAL_WEIGHTS.instagram_bio);
  }

  // ── LAYER B: Address hints ──
  if (input.address) {
    scoreText(acc, input.address, "address", SIGNAL_WEIGHTS.address);
  }

  // ── LAYER C: Confidence calculation ──
  const sortedVerticals = (Object.entries(acc.scores) as [Vertical, number][])
    .sort((a, b) => b[1] - a[1]);

  const [topVertical, topScore] = sortedVerticals[0];
  const [, secondScore] = sortedVerticals[1] || [null, 0];

  // Confidence based on absolute score AND gap to second
  const maxPossibleScore = SIGNAL_WEIGHTS.brand_match + SIGNAL_WEIGHTS.subcategory_match + SIGNAL_WEIGHTS.name_keyword + SIGNAL_WEIGHTS.description;
  const rawConfidence = Math.min(100, Math.round((topScore / Math.max(maxPossibleScore * 0.5, 1)) * 100));

  // Gap bonus: if top is much higher than second, we're more confident
  const gap = topScore - secondScore;
  const gapBonus = Math.min(15, Math.round(gap * 2));
  const confidence = Math.min(100, rawConfidence + gapBonus);

  // If zero score everywhere, very low confidence
  const finalConfidence = topScore === 0 ? 10 : confidence;

  // Determine if review needed
  const requiresReview = finalConfidence < 60;

  // Resolve cluster from subcategory
  let finalCluster: string | null = null;
  if (acc.bestSubcategory) {
    const verticalDef = CANONICAL_VERTICALS.find(v => v.value === topVertical);
    const subDef = verticalDef?.subcategories.find(s => s.value === acc.bestSubcategory);
    if (subDef) {
      finalCluster = subDef.cluster;
    }
  }

  // Build reason
  const reason = acc.reasons.length > 0
    ? acc.reasons.slice(0, 5).join("; ")
    : `No strong signals — defaulted to ${topVertical}`;

  return {
    canonical_vertical: topVertical,
    canonical_cluster: finalCluster,
    canonical_subcategory: acc.bestSubcategory,
    confidence_score: finalConfidence,
    classification_reason: reason,
    source_signals_used: acc.signals,
    requires_review: requiresReview,
    classification_version: ENGINE_VERSION,
    layer_scores: { ...acc.scores },
  };
}

// ═══════════════════════════════════════════════════════════
//  LEARNING HELPERS
// ═══════════════════════════════════════════════════════════

export interface ClassificationCorrection {
  businessName: string;
  sourceSubcategory?: string | null;
  oldVertical: Vertical;
  newVertical: Vertical;
  newSubcategory?: string | null;
  correctedBy: string;
}

/**
 * Build learning payload for persistence.
 * Consumed by the learning table for future pattern matching.
 */
export function buildLearningPayload(correction: ClassificationCorrection) {
  return {
    pattern_key: correction.businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").slice(0, 80),
    source_subcategory: correction.sourceSubcategory ?? null,
    old_vertical: correction.oldVertical,
    corrected_vertical: correction.newVertical,
    corrected_subcategory: correction.newSubcategory ?? null,
    corrected_by: correction.correctedBy,
    correction_count: 1,
  };
}

// ═══════════════════════════════════════════════════════════
//  BATCH CLASSIFIER
// ═══════════════════════════════════════════════════════════

export function classifyBatch(items: ClassificationInput[]): ClassificationResult[] {
  return items.map(classifyBusiness);
}
