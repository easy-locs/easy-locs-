/**
 * Smart Home Engine — Dashboard rendering layer.
 * Derives ALL category data from the canonical category-tree.ts.
 * This file handles time/geo priority only — NOT category definitions.
 */
import {
  CATEGORY_TREE,
  getPrimaryCategory,
  type PrimaryCategory,
  type FulfillmentType,
  type MobilityJobType,
} from "@/lib/taxonomy/category-tree";

export type TimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "latenight";

export type CategoryKey = string;

export interface SmartCategory {
  key: string;
  label: string;
  icon: string;
  image?: string;
  subtitle?: string;
  color: string;
  size: "normal" | "wide" | "tall";
  route: string;
  vertical: string;
  fulfillmentType: FulfillmentType;
  mobilityJobType: MobilityJobType;
}

export interface SmartHero {
  title: string;
  subtitle: string;
  emoji: string;
  cta: string;
  route: string;
  gradient: string;
}

/* ═══ Color mapping (semantic tokens only) ═══ */
const CATEGORY_COLORS: Record<string, string> = {
  food: "hsl(var(--warning))",
  grocery: "hsl(var(--success))",
  shops: "hsl(var(--primary))",
  services: "hsl(var(--info))",
  pharmacy: "hsl(var(--success))",
  beauty: "hsl(var(--accent))",
  taxi: "hsl(var(--accent))",
  delivery: "hsl(var(--info))",
  property: "hsl(var(--primary))",
  travel: "hsl(var(--info))",
};

/** Convert a PrimaryCategory → SmartCategory for dashboard rendering */
function toSmartCategory(cat: PrimaryCategory): SmartCategory {
  return {
    key: cat.key,
    label: cat.label,
    icon: cat.emoji,
    image: cat.key,
    subtitle: cat.subtitle,
    color: CATEGORY_COLORS[cat.key] ?? "hsl(var(--muted))",
    size: "normal",
    route: cat.route,
    vertical: cat.vertical,
    fulfillmentType: cat.fulfillment,
    mobilityJobType: cat.mobilityJobType,
  };
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

/* ═══ All 10 category keys in default order ═══ */
const ALL_KEYS = CATEGORY_TREE.map(c => c.key);

/* ═══ Time-based priority ═══ */
const TIME_PRIORITY: Record<TimeSlot, string[]> = {
  morning:   ["food", "grocery", "pharmacy", "taxi", "services", "beauty", "shops", "travel", "property", "delivery"],
  lunch:     ["food", "delivery", "shops", "services", "grocery", "taxi", "travel", "property", "pharmacy", "beauty"],
  afternoon: ["shops", "services", "grocery", "beauty", "delivery", "travel", "property", "food", "pharmacy", "taxi"],
  dinner:    ["food", "grocery", "delivery", "taxi", "travel", "shops", "services", "property", "beauty", "pharmacy"],
  latenight: ["food", "delivery", "taxi", "pharmacy", "shops", "travel", "property", "services", "grocery", "beauty"],
};

/* ═══ Country priority overrides ═══ */
const COUNTRY_BOOSTS: Record<string, string[]> = {
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

  const ordered: string[] = [];
  const seen = new Set<string>();

  if (countryBoost) {
    for (const key of countryBoost) {
      if (!seen.has(key)) { ordered.push(key); seen.add(key); }
    }
  }
  for (const key of timePriority) {
    if (!seen.has(key)) { ordered.push(key); seen.add(key); }
  }
  for (const key of ALL_KEYS) {
    if (!seen.has(key)) { ordered.push(key); seen.add(key); }
  }

  return ordered
    .map(key => getPrimaryCategory(key))
    .filter(Boolean)
    .map(cat => toSmartCategory(cat!));
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

export function getSmartSections(timezone?: string): { key: string; title: string; icon: string }[] {
  const slot = getTimeSlot(timezone);
  const base = [
    { key: "trending", title: "Trending near you", icon: "🔥" },
    { key: "toprated", title: "Best rated nearby", icon: "⭐" },
    { key: "opennow", title: "Open now", icon: "🟢" },
    { key: "fastest", title: "Fastest delivery", icon: "⚡" },
    { key: "offers", title: "Deals in your area", icon: "🎉" },
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
export function getCategoryFulfillment(key: string) {
  const cat = getPrimaryCategory(key);
  if (!cat) return undefined;
  return toSmartCategory(cat);
}

/** Get all category keys */
export function getAllCategoryKeys(): string[] {
  return ALL_KEYS;
}
