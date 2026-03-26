/**
 * Smart Home Engine — Single source of truth for dashboard category cards.
 * 10 primary verticals only. Subcategories (bakery, coffee, dineout, gifts, pets, concierge)
 * are demoted — accessible via browse routes, not top-level cards.
 *
 * Each card maps to:
 * - a canonical vertical or fulfillment entry point
 * - the correct route
 * - the correct fulfillment type
 */

export type TimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "latenight";

export type CategoryKey =
  | "food" | "grocery" | "shops" | "services" | "pharmacy"
  | "beauty" | "taxi" | "delivery" | "property" | "travel";

export interface SmartCategory {
  key: CategoryKey;
  label: string;
  icon: string;
  image?: string;
  subtitle?: string;
  color: string;
  size: "normal" | "wide" | "tall";
  route: string;
  /** Canonical vertical from world-class-taxonomy */
  vertical: string;
  /** Fulfillment type for dispatch resolution */
  fulfillmentType: "food_delivery" | "grocery_delivery" | "parcel_delivery" | "taxi" | "service_booking" | "property_listing" | "none";
  /** Mobility job_type if applicable */
  mobilityJobType: string | null;
}

export interface SmartHero {
  title: string;
  subtitle: string;
  emoji: string;
  cta: string;
  route: string;
  gradient: string;
}

/* ═══ Time Detection ═══ */
export function getTimeSlot(timezone?: string): TimeSlot {
  const now = new Date();
  let hour: number;
  try {
    hour = parseInt(new Intl.DateTimeFormat("en", { hour: "numeric", hour12: false, timeZone: timezone }).format(now));
  } catch {
    hour = now.getHours();
  }
  if (hour >= 5 && hour < 11) return "morning";
  if (hour >= 11 && hour < 14) return "lunch";
  if (hour >= 14 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 22) return "dinner";
  return "latenight";
}

/* ═══ Canonical 10 Primary Categories ═══ */
const PRIMARY_CATEGORIES: Record<CategoryKey, SmartCategory> = {
  food: {
    key: "food", label: "Food", icon: "🍕", image: "food",
    color: "hsl(var(--warning))", size: "normal",
    route: "/browse/food", subtitle: "Order now",
    vertical: "food", fulfillmentType: "food_delivery", mobilityJobType: "food_delivery",
  },
  grocery: {
    key: "grocery", label: "Grocery", icon: "🛒", image: "grocery",
    color: "hsl(var(--success))", size: "normal",
    route: "/browse/grocery", subtitle: "Fresh & fast",
    vertical: "grocery", fulfillmentType: "grocery_delivery", mobilityJobType: "grocery_delivery",
  },
  shops: {
    key: "shops", label: "Shops", icon: "🏪", image: "shops",
    color: "hsl(var(--primary))", size: "normal",
    route: "/browse/retail", subtitle: "Browse stores",
    vertical: "shops", fulfillmentType: "parcel_delivery", mobilityJobType: "parcel_delivery",
  },
  services: {
    key: "services", label: "Services", icon: "🔧", image: "services",
    color: "hsl(var(--info))", size: "normal",
    route: "/browse/services", subtitle: "Near you",
    vertical: "services", fulfillmentType: "service_booking", mobilityJobType: null,
  },
  pharmacy: {
    key: "pharmacy", label: "Pharmacy", icon: "💊", image: "pharmacy",
    color: "hsl(var(--success))", size: "normal",
    route: "/browse/healthcare?sub=pharmacy", subtitle: "Medicines",
    vertical: "healthcare", fulfillmentType: "parcel_delivery", mobilityJobType: "parcel_delivery",
  },
  beauty: {
    key: "beauty", label: "Beauty", icon: "💅", image: "beauty",
    color: "hsl(var(--accent))", size: "normal",
    route: "/browse/services?sub=beauty", subtitle: "Salon & spa",
    vertical: "services", fulfillmentType: "service_booking", mobilityJobType: null,
  },
  taxi: {
    key: "taxi", label: "Taxi", icon: "🚕", image: "taxi",
    color: "hsl(var(--accent))", size: "normal",
    route: "/mobility/taxi", subtitle: "Book a ride",
    vertical: "mobility", fulfillmentType: "taxi", mobilityJobType: "taxi",
  },
  delivery: {
    key: "delivery", label: "Delivery", icon: "🚚", image: "delivery",
    color: "hsl(var(--info))", size: "normal",
    route: "/mobility/delivery", subtitle: "Send & track",
    vertical: "mobility", fulfillmentType: "parcel_delivery", mobilityJobType: "parcel_delivery",
  },
  property: {
    key: "property", label: "Property", icon: "🏠", image: "property",
    color: "hsl(var(--primary))", size: "normal",
    route: "/browse/real_estate", subtitle: "Rent & buy",
    vertical: "property", fulfillmentType: "property_listing", mobilityJobType: null,
  },
  travel: {
    key: "travel", label: "Travel", icon: "✈️", image: "travel",
    color: "hsl(var(--info))", size: "normal",
    route: "/travel", subtitle: "Flights & hotels",
    vertical: "experiences", fulfillmentType: "none", mobilityJobType: null,
  },
};

/* ═══ Time-based priority (10 primaries only) ═══ */
const TIME_PRIORITY: Record<TimeSlot, CategoryKey[]> = {
  morning:   ["food", "grocery", "pharmacy", "taxi", "services", "beauty", "shops", "travel", "property", "delivery"],
  lunch:     ["food", "delivery", "shops", "services", "grocery", "taxi", "travel", "property", "pharmacy", "beauty"],
  afternoon: ["shops", "services", "grocery", "beauty", "delivery", "travel", "property", "food", "pharmacy", "taxi"],
  dinner:    ["food", "grocery", "delivery", "taxi", "travel", "shops", "services", "property", "beauty", "pharmacy"],
  latenight: ["food", "delivery", "taxi", "pharmacy", "shops", "travel", "property", "services", "grocery", "beauty"],
};

/* ═══ Country priority overrides ═══ */
const COUNTRY_BOOSTS: Record<string, CategoryKey[]> = {
  AE: ["food", "grocery", "taxi", "beauty", "pharmacy", "property", "shops"],
  FR: ["property", "services", "food", "shops", "pharmacy"],
  MA: ["food", "services", "taxi", "property", "pharmacy"],
  US: ["food", "grocery", "delivery", "taxi", "shops", "pharmacy"],
  GB: ["food", "shops", "property", "delivery", "services"],
  SA: ["food", "grocery", "taxi", "beauty", "pharmacy"],
};

/* ═══ Hero content by time ═══ */
const HERO_BY_TIME: Record<TimeSlot, SmartHero> = {
  morning: {
    title: "Good morning ☀️",
    subtitle: "Breakfast, coffee & bakery near you",
    emoji: "🥐",
    cta: "Order breakfast",
    route: "/browse/food?sub=bakery",
    gradient: "linear-gradient(135deg, hsl(35 90% 55%), hsl(45 95% 65%))",
  },
  lunch: {
    title: "Lunch time 🍱",
    subtitle: "Fast delivery from top spots",
    emoji: "🍕",
    cta: "Order lunch",
    route: "/browse/food",
    gradient: "linear-gradient(135deg, hsl(15 85% 55%), hsl(25 90% 60%))",
  },
  afternoon: {
    title: "Explore nearby 🔍",
    subtitle: "Shops, services & deals around you",
    emoji: "🏪",
    cta: "Discover",
    route: "/radar",
    gradient: "linear-gradient(135deg, hsl(200 80% 50%), hsl(220 85% 55%))",
  },
  dinner: {
    title: "Good evening 🍽️",
    subtitle: "Dine out or order in — your pick",
    emoji: "🍣",
    cta: "Find dinner",
    route: "/browse/food?sub=restaurant",
    gradient: "linear-gradient(135deg, hsl(280 60% 45%), hsl(320 65% 50%))",
  },
  latenight: {
    title: "Still open 🌙",
    subtitle: "Late-night eats, rides & delivery",
    emoji: "🌮",
    cta: "Order now",
    route: "/browse/food",
    gradient: "linear-gradient(135deg, hsl(240 50% 25%), hsl(260 55% 35%))",
  },
};

/* ═══ Public API ═══ */

export function getSmartCategories(timezone?: string, countryCode?: string): SmartCategory[] {
  const slot = getTimeSlot(timezone);
  const timePriority = TIME_PRIORITY[slot];
  const countryBoost = countryCode ? COUNTRY_BOOSTS[countryCode.toUpperCase()] : undefined;

  const ordered: CategoryKey[] = [];
  const seen = new Set<CategoryKey>();

  if (countryBoost) {
    for (const key of countryBoost) {
      if (!seen.has(key)) { ordered.push(key); seen.add(key); }
    }
  }
  for (const key of timePriority) {
    if (!seen.has(key)) { ordered.push(key); seen.add(key); }
  }
  // Ensure all 10 are present
  for (const key of Object.keys(PRIMARY_CATEGORIES) as CategoryKey[]) {
    if (!seen.has(key)) { ordered.push(key); seen.add(key); }
  }
  return ordered.map(key => PRIMARY_CATEGORIES[key]);
}

export function getSmartHero(timezone?: string): SmartHero {
  return HERO_BY_TIME[getTimeSlot(timezone)];
}

export function getTimeGreeting(timezone?: string): string {
  const slot = getTimeSlot(timezone);
  switch (slot) {
    case "morning": return "Good morning";
    case "lunch": return "Bon appétit";
    case "afternoon": return "Good afternoon";
    case "dinner": return "Good evening";
    case "latenight": return "Night owl";
  }
}

/** Dynamic sections ordered by relevance */
export function getSmartSections(timezone?: string): { key: string; title: string; icon: string }[] {
  const slot = getTimeSlot(timezone);
  const base = [
    { key: "trending",  title: "Trending near you",  icon: "🔥" },
    { key: "toprated",  title: "Best rated nearby",  icon: "⭐" },
    { key: "opennow",   title: "Open now",            icon: "🟢" },
    { key: "fastest",   title: "Fastest delivery",    icon: "⚡" },
    { key: "offers",    title: "Deals in your area",  icon: "🎉" },
  ];
  if (slot === "latenight") {
    const open = base.find(s => s.key === "opennow")!;
    return [open, ...base.filter(s => s.key !== "opennow")];
  }
  if (slot === "lunch" || slot === "dinner") {
    const fast = base.find(s => s.key === "fastest")!;
    return [fast, ...base.filter(s => s.key !== "fastest")];
  }
  return base;
}

/** Get category → fulfillment mapping for a given key */
export function getCategoryFulfillment(key: CategoryKey) {
  return PRIMARY_CATEGORIES[key];
}

/** Get all category keys */
export function getAllCategoryKeys(): CategoryKey[] {
  return Object.keys(PRIMARY_CATEGORIES) as CategoryKey[];
}
