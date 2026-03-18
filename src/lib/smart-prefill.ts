/**
 * Smart Prefill Engine for Easy-Locs
 * Detects listing context from title/description and auto-fills fields.
 */
import { getCategoryConfig, CATEGORY_REGISTRY, type ListingType, type EntityType, type PresenceMode, type CoverageMode } from "@/lib/category-config";
import { COUNTRY_CURRENCY_MAP } from "@/lib/i18n";

/* ─── Output ─── */
export interface DetectedContext {
  category: string;
  listing_type: ListingType;
  entity_type: EntityType;
  presence_mode: PresenceMode;
  coverage_mode: CoverageMode;
  coverage_radius_m: number;
  confidence: number; // 0-1
}

/* ─── Keyword rules ─── */
interface KeywordRule {
  keywords: string[];
  category: string;
  listing_type?: ListingType;
  entity_type?: EntityType;
  presence_mode?: PresenceMode;
  coverage_mode?: CoverageMode;
  coverage_radius_m?: number;
  weight: number;
}

const KEYWORD_RULES: KeywordRule[] = [
  // Food & delivery
  { keywords: ["pizza", "burger", "sushi", "restaurant", "café", "bakery", "food truck", "traiteur", "plat", "repas", "cuisine"],
    category: "food", listing_type: "shop", weight: 3 },
  { keywords: ["delivery", "livraison", "uber eats", "food delivery", "pizza delivery"],
    category: "food", listing_type: "service", entity_type: "mobile_service", presence_mode: "live", coverage_mode: "live_radius", coverage_radius_m: 5000, weight: 5 },
  // Grocery
  { keywords: ["grocery", "supermarket", "épicerie", "market", "bio", "organic store"],
    category: "grocery", listing_type: "shop", weight: 3 },
  // Taxi / transport
  { keywords: ["taxi", "vtc", "uber", "chauffeur", "transport", "ride", "shuttle", "navette"],
    category: "taxi", listing_type: "service", entity_type: "driver", presence_mode: "live", coverage_mode: "live_radius", coverage_radius_m: 10000, weight: 5 },
  // Delivery / courier
  { keywords: ["courier", "coursier", "colis", "parcel", "shipping", "express delivery", "moto delivery"],
    category: "delivery", listing_type: "service", entity_type: "driver", presence_mode: "live", coverage_mode: "live_radius", coverage_radius_m: 10000, weight: 5 },
  // Beauty
  { keywords: ["coiffeur", "hairdresser", "barber", "salon", "nail", "spa", "massage", "beauty", "maquillage", "esthétique", "makeup"],
    category: "beauty", listing_type: "service", weight: 3 },
  // Repair
  { keywords: ["repair", "réparation", "plumber", "plombier", "electrician", "électricien", "handyman", "bricolage", "fix", "maintenance"],
    category: "repair", listing_type: "service", entity_type: "mobile_service", presence_mode: "live", coverage_mode: "live_radius", coverage_radius_m: 5000, weight: 4 },
  // Home
  { keywords: ["cleaning", "ménage", "gardening", "jardin", "peinture", "painting", "moving", "déménagement", "home service"],
    category: "home", listing_type: "service", entity_type: "mobile_service", weight: 3 },
  // Property
  { keywords: ["apartment", "appartement", "house", "maison", "villa", "studio", "loft", "terrain", "land", "room", "chambre", "flat", "condo"],
    category: "property", listing_type: "sale", weight: 4 },
  { keywords: ["rent", "louer", "location", "bail", "lease", "colocation"],
    category: "property", listing_type: "service", weight: 4 },
  // Automotive
  { keywords: ["car", "voiture", "moto", "motorcycle", "scooter", "bicycle", "vélo", "truck", "camion", "van", "auto"],
    category: "automotive", listing_type: "sale", weight: 3 },
  // Electronics
  { keywords: ["iphone", "samsung", "laptop", "macbook", "pc", "computer", "ordinateur", "tablet", "tablette", "console", "ps5", "xbox", "phone", "téléphone", "airpods", "camera", "drone", "tv", "monitor", "écran", "gpu", "graphics card"],
    category: "electronics", listing_type: "sale", weight: 4 },
  // Fashion
  { keywords: ["shoes", "chaussures", "sneakers", "dress", "robe", "jacket", "veste", "bag", "sac", "watch", "montre", "clothing", "vêtement", "jeans", "t-shirt", "hoodie"],
    category: "fashion", listing_type: "sale", weight: 3 },
  // Hotel
  { keywords: ["hotel", "hôtel", "hostel", "airbnb", "guesthouse", "lodge", "resort", "b&b", "bed and breakfast"],
    category: "hotel", listing_type: "shop", weight: 4 },
  // Events
  { keywords: ["event", "événement", "concert", "ticket", "billet", "festival", "conference", "workshop", "atelier"],
    category: "events", listing_type: "sale", weight: 3 },
];

/* ─── Defaults ─── */
const FALLBACK: DetectedContext = {
  category: "other",
  listing_type: "sale",
  entity_type: "fixed_store",
  presence_mode: "pin",
  coverage_mode: "radius",
  coverage_radius_m: 3000,
  confidence: 0,
};

/**
 * Detect listing context from title + optional description.
 * Uses keyword matching against the category registry.
 */
export function detectListingContext(input: { title: string; description?: string }): DetectedContext {
  const text = `${input.title} ${input.description || ""}`.toLowerCase().trim();
  if (!text) return { ...FALLBACK };

  // Score each rule
  let bestRule: KeywordRule | null = null;
  let bestScore = 0;

  for (const rule of KEYWORD_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) {
        score += rule.weight;
        // Bonus for title match
        if (input.title.toLowerCase().includes(kw.toLowerCase())) {
          score += 2;
        }
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestRule = rule;
    }
  }

  if (!bestRule || bestScore < 3) {
    return { ...FALLBACK, confidence: 0 };
  }

  const catCfg = getCategoryConfig(bestRule.category);
  const confidence = Math.min(bestScore / 12, 1);

  return {
    category: bestRule.category,
    listing_type: bestRule.listing_type || catCfg.defaultListingType,
    entity_type: bestRule.entity_type || catCfg.entityTypeDefault,
    presence_mode: bestRule.presence_mode || catCfg.defaultPresenceMode,
    coverage_mode: bestRule.coverage_mode || (catCfg.supportsRadius ? "radius" : "point"),
    coverage_radius_m: bestRule.coverage_radius_m || 3000,
    confidence,
  };
}

/* ─── Location → Currency helper ─── */
export function currencyFromCountry(countryCode: string): string {
  return COUNTRY_CURRENCY_MAP[countryCode?.toUpperCase()] || "EUR";
}

/* ─── Reverse geocode (city/country from coords) ─── */
export interface GeoResult {
  city: string;
  country: string; // ISO 2-letter
  currency: string;
}

/**
 * Best-effort reverse geocode using browser Intl + timezone heuristics.
 * No external API needed for the country/currency part.
 */
export function detectLocationFromTimezone(): Partial<GeoResult> {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone; // e.g. "Europe/Paris"
    const locale = navigator.language || "en";
    const parts = locale.split("-");
    const region = parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "";
    if (region && region.length === 2) {
      return {
        country: region,
        currency: COUNTRY_CURRENCY_MAP[region] || "EUR",
      };
    }
    // Fallback timezone→country mapping for common cases
    const TZ_COUNTRY: Record<string, string> = {
      "Europe/Paris": "FR", "Europe/London": "GB", "America/New_York": "US",
      "America/Los_Angeles": "US", "America/Chicago": "US", "Europe/Berlin": "DE",
      "Europe/Madrid": "ES", "Europe/Rome": "IT", "Asia/Dubai": "AE",
      "Asia/Tokyo": "JP", "Africa/Casablanca": "MA", "Africa/Abidjan": "CI",
      "America/Sao_Paulo": "BR", "America/Toronto": "CA", "Asia/Kolkata": "IN",
      "Africa/Johannesburg": "ZA", "Australia/Sydney": "AU", "Europe/Zurich": "CH",
      "Asia/Bangkok": "TH", "America/Mexico_City": "MX",
    };
    const tzCountry = TZ_COUNTRY[tz];
    if (tzCountry) {
      return { country: tzCountry, currency: COUNTRY_CURRENCY_MAP[tzCountry] || "EUR" };
    }
  } catch {}
  return {};
}
