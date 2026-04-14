/**
 * ASSET GOVERNANCE TAXONOMY — Single Source of Truth for Banner/Hero/Asset Rules
 * ================================================================================
 * Extends CATEGORY_TREE with per-vertical asset governance fields:
 * - allowedKeywords: keyword signals that are valid for this vertical's assets
 * - forbiddenKeywords: keyword signals that indicate cross-vertical contamination
 * - fallbackGroup: the fallback asset group to use when no valid asset exists
 * - validAssetTypes: asset types allowed for this vertical
 * - bannerRules: specific rules for banner/hero assets
 *
 * This is the single authority for all asset governance decisions.
 * ALL banner/hero validation MUST consult this file.
 */

export type AssetVertical =
  | "food"
  | "grocery"
  | "shops"
  | "services"
  | "healthcare"
  | "beauty"
  | "stay"
  | "property"
  | "mobility"
  | "experiences"
  | "utility"
  | "education"
  | "finance";

export type AssetType =
  | "banner"
  | "hero"
  | "video"
  | "thumbnail"
  | "logo"
  | "category_cover"
  | "promo";

export type TrustLevel = "platform" | "verified" | "imported" | "unknown";
export type ModerationStatus = "approved" | "pending" | "rejected" | "quarantined";
export type PublishStatus = "published" | "draft" | "blocked" | "fallback";

export interface VerticalAssetGovernance {
  vertical: AssetVertical;
  label: string;
  allowedKeywords: string[];
  forbiddenKeywords: string[];
  forbiddenVerticals: AssetVertical[];
  fallbackGroup: string;
  fallbackAssetPath: string;
  validAssetTypes: AssetType[];
  minScoreThreshold: number;
  bannerRules: BannerRule[];
  heroRules: HeroRule[];
}

export interface BannerRule {
  id: string;
  description: string;
  check: (metadata: AssetMetadata) => boolean;
  severity: "block" | "warn";
  reason: string;
}

export interface HeroRule {
  id: string;
  description: string;
  check: (metadata: AssetMetadata) => boolean;
  severity: "block" | "warn";
  reason: string;
}

export interface AssetMetadata {
  assetId: string;
  filename?: string;
  altText?: string;
  url?: string;
  title?: string;
  description?: string;
  tags?: string[];
  declaredVertical?: string;
  declaredCategory?: string;
  declaredSubcategory?: string;
  source?: string;
  trustLevel?: TrustLevel;
}

function hasAnyKeyword(metadata: AssetMetadata, keywords: string[]): boolean {
  const searchText = [
    metadata.filename ?? "",
    metadata.altText ?? "",
    metadata.url ?? "",
    metadata.title ?? "",
    metadata.description ?? "",
    ...(metadata.tags ?? []),
  ].join(" ").toLowerCase();

  return keywords.some((kw) => searchText.includes(kw.toLowerCase()));
}

export const VERTICAL_ASSET_GOVERNANCE: Record<AssetVertical, VerticalAssetGovernance> = {
  food: {
    vertical: "food",
    label: "Food & Dining",
    allowedKeywords: [
      "food", "restaurant", "cafe", "coffee", "meal", "dish", "cuisine", "menu",
      "dining", "eat", "kitchen", "chef", "cook", "burger", "pizza", "sushi",
      "salad", "breakfast", "lunch", "dinner", "bakery", "pastry", "dessert",
      "takeaway", "delivery", "bistro", "grill", "bbq", "sandwich", "wrap",
      "noodle", "rice", "bread", "cake", "sweet", "soup", "plate", "bowl",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic", "doctor", "prescription",
      "drug", "pill", "injection", "surgery", "medical", "health center",
      "beach", "ocean", "sea", "wave", "bikini", "swimsuit", "sunbathing",
      "spa", "massage", "nail", "makeup", "salon", "beauty treatment",
      "property", "apartment", "villa", "real estate", "mortgage",
      "taxi", "ride", "uber", "car rental", "flight", "airport",
    ],
    forbiddenVerticals: ["healthcare", "beauty", "stay", "property", "mobility"],
    fallbackGroup: "food",
    fallbackAssetPath: "/assets/fallbacks/food-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover", "promo"],
    minScoreThreshold: 60,
    bannerRules: [
      {
        id: "food-no-medical",
        description: "Food banners must not contain medical/pharma imagery",
        check: (m) => !hasAnyKeyword(m, ["pharmacy", "medicine", "hospital", "clinic", "doctor", "medical"]),
        severity: "block",
        reason: "Cross-vertical contamination: healthcare keywords in food banner",
      },
      {
        id: "food-no-beach-travel",
        description: "Food banners must not contain beach/travel imagery",
        check: (m) => !hasAnyKeyword(m, ["beach", "ocean", "sea", "wave", "bikini", "travel", "tourist"]),
        severity: "block",
        reason: "Cross-vertical contamination: travel/beach keywords in food banner",
      },
    ],
    heroRules: [
      {
        id: "food-hero-food-signal",
        description: "Food hero must contain recognizable food signals",
        check: (m) => hasAnyKeyword(m, ["food", "restaurant", "cafe", "meal", "dish", "dining", "kitchen", "cuisine"]),
        severity: "warn",
        reason: "Food hero lacks food-specific signals",
      },
    ],
  },

  grocery: {
    vertical: "grocery",
    label: "Grocery & Market",
    allowedKeywords: [
      "grocery", "supermarket", "market", "store", "fresh", "produce", "fruit",
      "vegetable", "organic", "dairy", "milk", "bread", "butcher", "meat",
      "fish", "seafood", "bakery", "shopping", "cart", "basket", "shelf",
      "aisle", "food store", "convenience", "mini mart", "hypermarket",
      "snack", "beverage", "household", "cleaning", "product", "package",
    ],
    forbiddenKeywords: [
      "beach", "ocean", "sea", "wave", "holiday", "travel", "tourist",
      "pharmacy", "medicine", "hospital", "clinic", "doctor", "prescription",
      "salon", "beauty", "spa", "massage", "makeup", "nail",
      "taxi", "car rental", "flight", "hotel", "resort",
      "property", "apartment", "real estate",
    ],
    forbiddenVerticals: ["healthcare", "beauty", "stay", "property", "mobility", "experiences"],
    fallbackGroup: "grocery",
    fallbackAssetPath: "/assets/fallbacks/grocery-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover", "promo"],
    minScoreThreshold: 60,
    bannerRules: [
      {
        id: "grocery-no-travel",
        description: "Grocery banners must not show travel/beach imagery",
        check: (m) => !hasAnyKeyword(m, ["beach", "ocean", "holiday", "travel", "resort", "hotel"]),
        severity: "block",
        reason: "Cross-vertical contamination: travel/beach keywords in grocery banner",
      },
      {
        id: "grocery-no-medical",
        description: "Grocery banners must not show medical imagery",
        check: (m) => !hasAnyKeyword(m, ["pharmacy", "medicine", "hospital", "clinic", "medical", "prescription"]),
        severity: "block",
        reason: "Cross-vertical contamination: healthcare keywords in grocery banner",
      },
    ],
    heroRules: [
      {
        id: "grocery-hero-signal",
        description: "Grocery hero must contain recognizable grocery signals",
        check: (m) => hasAnyKeyword(m, ["grocery", "market", "supermarket", "fresh", "produce", "store", "shopping"]),
        severity: "warn",
        reason: "Grocery hero lacks grocery-specific signals",
      },
    ],
  },

  healthcare: {
    vertical: "healthcare",
    label: "Health & Medical",
    allowedKeywords: [
      "health", "medical", "clinic", "hospital", "doctor", "pharmacy",
      "medicine", "prescription", "treatment", "care", "nurse", "patient",
      "dental", "dental clinic", "laboratory", "lab", "physiotherapy",
      "health center", "wellness center", "diagnostic", "specialist",
      "pediatric", "surgery", "emergency", "ambulance", "healthcare",
      "pharmaceutical", "drug", "pill", "capsule", "vaccine", "injection",
    ],
    forbiddenKeywords: [
      "beach", "ocean", "sea", "wave", "bikini", "swimsuit", "holiday",
      "travel", "tourist", "resort", "hotel", "nightclub", "bar",
      "fashion", "clothing", "luxury brand", "jewelry", "perfume",
      "pizza", "burger", "restaurant", "cafe", "nightlife",
      "beauty salon", "nail", "makeup artist", "tattoo",
    ],
    forbiddenVerticals: ["food", "beauty", "stay", "experiences", "shops"],
    fallbackGroup: "healthcare",
    fallbackAssetPath: "/assets/fallbacks/service-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 65,
    bannerRules: [
      {
        id: "healthcare-no-beach-beauty",
        description: "Healthcare banners must not show beach, beauty, or fashion content",
        check: (m) => !hasAnyKeyword(m, ["beach", "bikini", "swimsuit", "fashion", "beauty salon", "nail", "makeup", "tattoo", "spa"]),
        severity: "block",
        reason: "Cross-vertical contamination: non-medical imagery in healthcare banner",
      },
      {
        id: "healthcare-no-food",
        description: "Healthcare banners must not show food-only content (without medical context)",
        check: (m) => !hasAnyKeyword(m, ["restaurant", "cafe", "pizza", "burger", "nightclub", "bar"]),
        severity: "block",
        reason: "Cross-vertical contamination: food/entertainment keywords in healthcare banner",
      },
    ],
    heroRules: [
      {
        id: "healthcare-hero-signal",
        description: "Healthcare hero must contain recognizable medical signals",
        check: (m) => hasAnyKeyword(m, ["health", "medical", "clinic", "hospital", "doctor", "pharmacy", "care", "dental", "wellness"]),
        severity: "warn",
        reason: "Healthcare hero lacks medical-specific signals",
      },
    ],
  },

  beauty: {
    vertical: "beauty",
    label: "Beauty & Personal Care",
    allowedKeywords: [
      "beauty", "salon", "spa", "hair", "nail", "makeup", "cosmetic", "skincare",
      "facial", "massage", "barber", "wax", "lash", "brow", "tattoo", "piercing",
      "grooming", "wellness", "treatment", "style", "color", "highlight",
      "manicure", "pedicure", "blowdry", "keratin", "threading",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic", "doctor", "prescription",
      "drug", "medical treatment", "surgery", "injection", "vaccination",
      "grocery", "supermarket", "market", "food delivery", "restaurant",
      "taxi", "car rental", "flight", "property", "real estate",
    ],
    forbiddenVerticals: ["healthcare", "food", "grocery", "property", "mobility"],
    fallbackGroup: "beauty",
    fallbackAssetPath: "/assets/fallbacks/beauty-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover", "promo"],
    minScoreThreshold: 60,
    bannerRules: [
      {
        id: "beauty-no-medical",
        description: "Beauty banners must not show medical/pharma content",
        check: (m) => !hasAnyKeyword(m, ["pharmacy", "medicine", "hospital", "clinic", "doctor", "prescription", "medical", "drug"]),
        severity: "block",
        reason: "Cross-vertical contamination: medical keywords in beauty banner",
      },
    ],
    heroRules: [
      {
        id: "beauty-hero-signal",
        description: "Beauty hero must contain recognizable beauty/salon signals",
        check: (m) => hasAnyKeyword(m, ["beauty", "salon", "spa", "hair", "nail", "makeup", "cosmetic", "skincare", "grooming"]),
        severity: "warn",
        reason: "Beauty hero lacks beauty-specific signals",
      },
    ],
  },

  shops: {
    vertical: "shops",
    label: "Retail & Shops",
    allowedKeywords: [
      "shop", "store", "retail", "fashion", "clothing", "apparel", "boutique",
      "electronics", "gadget", "jewelry", "accessories", "luxury", "brand",
      "gift", "toy", "home decor", "furniture", "flowers", "sport", "shoes",
      "bag", "perfume", "cosmetic", "skincare", "watch", "book", "stationery",
      "department store", "outlet", "mall", "collection", "product",
    ],
    forbiddenKeywords: [
      "beach resort", "ocean", "wave", "bikini",
      "pharmacy prescription", "medicine", "hospital", "surgery",
      "taxi", "flight", "airport transfer",
    ],
    forbiddenVerticals: ["healthcare", "mobility"],
    fallbackGroup: "shops",
    fallbackAssetPath: "/assets/fallbacks/shops-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover", "promo"],
    minScoreThreshold: 55,
    bannerRules: [
      {
        id: "shops-no-prescription",
        description: "Shop banners must not show prescription/medical content",
        check: (m) => !hasAnyKeyword(m, ["prescription", "hospital", "surgery", "medical treatment", "clinic"]),
        severity: "block",
        reason: "Cross-vertical contamination: medical prescription in shops banner",
      },
    ],
    heroRules: [],
  },

  services: {
    vertical: "services",
    label: "Local Services",
    allowedKeywords: [
      "service", "repair", "cleaning", "plumbing", "electrical", "handyman",
      "ac repair", "maintenance", "movers", "laundry", "tailoring", "printing",
      "tutoring", "legal", "photography", "accounting", "car wash", "carpenter",
      "pest control", "gardening", "painting", "locksmith", "delivery",
    ],
    forbiddenKeywords: [
      "beach", "ocean", "sea", "bikini", "holiday resort",
      "pharmacy", "hospital", "surgery",
      "restaurant", "cafe", "food delivery",
    ],
    forbiddenVerticals: ["healthcare", "food", "stay"],
    fallbackGroup: "service",
    fallbackAssetPath: "/assets/fallbacks/service-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 55,
    bannerRules: [],
    heroRules: [],
  },

  stay: {
    vertical: "stay",
    label: "Hotels & Stays",
    allowedKeywords: [
      "hotel", "resort", "hostel", "motel", "stay", "accommodation", "room",
      "suite", "lobby", "pool", "bed", "check-in", "booking", "reservation",
      "spa hotel", "boutique hotel", "luxury hotel", "serviced apartment",
      "holiday home", "vacation rental", "airbnb", "guesthouse",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "clinic", "doctor", "hospital",
      "grocery", "supermarket", "food delivery", "restaurant delivery",
      "taxi dispatch", "car rental fleet",
    ],
    forbiddenVerticals: ["healthcare", "grocery"],
    fallbackGroup: "stay",
    fallbackAssetPath: "/assets/fallbacks/stay-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 60,
    bannerRules: [
      {
        id: "stay-no-medical",
        description: "Stay banners must not show medical/pharmacy content",
        check: (m) => !hasAnyKeyword(m, ["pharmacy", "hospital", "clinic", "medicine", "prescription"]),
        severity: "block",
        reason: "Cross-vertical contamination: healthcare keywords in stay banner",
      },
    ],
    heroRules: [],
  },

  property: {
    vertical: "property",
    label: "Property & Real Estate",
    allowedKeywords: [
      "property", "apartment", "villa", "house", "real estate", "rent", "sale",
      "bedroom", "sqft", "sqm", "floor plan", "listing", "buy", "lease",
      "penthouse", "studio", "townhouse", "duplex", "loft", "development",
      "developer", "project", "investment", "residential", "commercial",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic",
      "restaurant", "food delivery", "grocery",
      "beauty salon", "spa treatment",
      "taxi", "rideshare",
    ],
    forbiddenVerticals: ["healthcare", "food", "grocery", "beauty", "mobility"],
    fallbackGroup: "property",
    fallbackAssetPath: "/assets/fallbacks/property-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 60,
    bannerRules: [],
    heroRules: [],
  },

  mobility: {
    vertical: "mobility",
    label: "Mobility & Transport",
    allowedKeywords: [
      "taxi", "cab", "ride", "car", "vehicle", "transport", "driver", "chauffeur",
      "delivery", "courier", "bike", "scooter", "car rental", "limousine",
      "airport transfer", "pickup", "dropoff", "route",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic",
      "beauty salon", "spa",
      "restaurant dining", "cafe",
    ],
    forbiddenVerticals: ["healthcare", "beauty", "food"],
    fallbackGroup: "mobility",
    fallbackAssetPath: "/assets/fallbacks/mobility-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 55,
    bannerRules: [],
    heroRules: [],
  },

  experiences: {
    vertical: "experiences",
    label: "Experiences & Activities",
    allowedKeywords: [
      "tour", "activity", "experience", "adventure", "safari", "cruise", "diving",
      "hiking", "ski", "museum", "event", "concert", "theater", "show",
      "city tour", "excursion", "attraction", "theme park", "festival",
      "water sports", "culture", "sightseeing",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic",
      "grocery delivery", "food delivery only",
    ],
    forbiddenVerticals: ["healthcare", "grocery"],
    fallbackGroup: "experiences",
    fallbackAssetPath: "/assets/fallbacks/experiences-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover", "video"],
    minScoreThreshold: 55,
    bannerRules: [],
    heroRules: [],
  },

  utility: {
    vertical: "utility",
    label: "Utility & Infrastructure",
    allowedKeywords: [
      "atm", "fuel", "gas station", "parking", "bank", "ev charging",
      "post office", "utility", "infrastructure", "public service",
    ],
    forbiddenKeywords: [
      "beach", "holiday", "restaurant dining",
      "beauty salon", "spa",
    ],
    forbiddenVerticals: ["food", "beauty", "experiences"],
    fallbackGroup: "utility",
    fallbackAssetPath: "/assets/fallbacks/utility-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 50,
    bannerRules: [],
    heroRules: [],
  },

  education: {
    vertical: "education",
    label: "Education",
    allowedKeywords: [
      "school", "university", "college", "education", "learning", "course",
      "training", "tutoring", "classroom", "student", "teacher", "knowledge",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital", "clinic",
      "bar", "nightclub",
    ],
    forbiddenVerticals: ["healthcare"],
    fallbackGroup: "service",
    fallbackAssetPath: "/assets/fallbacks/service-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 50,
    bannerRules: [],
    heroRules: [],
  },

  finance: {
    vertical: "finance",
    label: "Finance",
    allowedKeywords: [
      "bank", "finance", "payment", "transfer", "investment", "insurance",
      "crypto", "exchange", "banking", "credit", "loan", "mortgage",
    ],
    forbiddenKeywords: [
      "pharmacy", "medicine", "hospital",
      "beach", "holiday",
    ],
    forbiddenVerticals: ["healthcare"],
    fallbackGroup: "utility",
    fallbackAssetPath: "/assets/fallbacks/utility-default.webp",
    validAssetTypes: ["banner", "hero", "thumbnail", "category_cover"],
    minScoreThreshold: 50,
    bannerRules: [],
    heroRules: [],
  },
};

export function getVerticalGovernance(vertical: string): VerticalAssetGovernance | null {
  return VERTICAL_ASSET_GOVERNANCE[vertical as AssetVertical] ?? null;
}

export function getAllVerticals(): AssetVertical[] {
  return Object.keys(VERTICAL_ASSET_GOVERNANCE) as AssetVertical[];
}

export function getVerticalFallbackPath(vertical: string): string {
  const gov = getVerticalGovernance(vertical);
  return gov?.fallbackAssetPath ?? "/assets/fallbacks/service-default.webp";
}

export function getVerticalFallbackGroup(vertical: string): string {
  const gov = getVerticalGovernance(vertical);
  return gov?.fallbackGroup ?? "service";
}

export function getForbiddenVerticals(vertical: string): AssetVertical[] {
  const gov = getVerticalGovernance(vertical);
  return gov?.forbiddenVerticals ?? [];
}

export function getMinScoreThreshold(vertical: string): number {
  const gov = getVerticalGovernance(vertical);
  return gov?.minScoreThreshold ?? 60;
}
