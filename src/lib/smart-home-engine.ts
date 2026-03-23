/**
 * Smart Home Engine — Time/location/country-aware homepage intelligence.
 * Drives category priority, hero content, and section ordering.
 * Expanded with Careem-style super-app categories.
 */

export type TimeSlot = "morning" | "lunch" | "afternoon" | "dinner" | "latenight";
export type CategoryKey =
  | "food" | "grocery" | "shops" | "services" | "taxi" | "delivery"
  | "property" | "wallet" | "coffee" | "bakery" | "dineout" | "beauty"
  | "concierge" | "mobility" | "rentals" | "stays" | "travel"
  | "healthcare" | "electronics" | "gifts" | "pharmacy" | "pets" | "flowers";

export interface SmartCategory {
  key: CategoryKey;
  label: string;
  icon: string; // emoji fallback
  image?: string; // image module path key
  subtitle?: string;
  color: string; // hsl token
  size: "normal" | "wide" | "tall";
  route: string;
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

/* ═══ All Categories ═══ */
const ALL_CATEGORIES: Record<CategoryKey, SmartCategory> = {
  food:        { key: "food",        label: "Food",         icon: "🍕", image: "food",        color: "hsl(var(--warning))",  size: "normal", route: "/food",                     subtitle: "Order now" },
  grocery:     { key: "grocery",     label: "Grocery",      icon: "🛒", image: "grocery",     color: "hsl(var(--success))",  size: "normal", route: "/grocery",                  subtitle: "Fresh & fast" },
  shops:       { key: "shops",       label: "Shops",        icon: "🏪", image: "shops",       color: "hsl(var(--primary))",  size: "normal", route: "/shops",                    subtitle: "Browse stores" },
  services:    { key: "services",    label: "Services",     icon: "🔧", image: "services",    color: "hsl(var(--info))",     size: "normal", route: "/services-hub",             subtitle: "Near you" },
  taxi:        { key: "taxi",        label: "Taxi",         icon: "🚕", image: "taxi",        color: "hsl(var(--accent))",   size: "normal", route: "/ride",                     subtitle: "Book a ride" },
  delivery:    { key: "delivery",    label: "Delivery",     icon: "🚚", image: "delivery",    color: "hsl(var(--info))",     size: "normal", route: "/send",                     subtitle: "Send & track" },
  property:    { key: "property",    label: "Property",     icon: "🏠", image: "property",    color: "hsl(var(--primary))",  size: "normal", route: "/real-estate",              subtitle: "Rent & buy" },
  wallet:      { key: "wallet",      label: "Pay",          icon: "💳", image: "wallet",      color: "hsl(var(--success))",  size: "normal", route: "/wallet/hub",               subtitle: "Pay & send" },
  coffee:      { key: "coffee",      label: "Coffee",       icon: "☕", image: "coffee",      color: "hsl(var(--warning))",  size: "normal", route: "/food?sub=cafe",            subtitle: "Wake up" },
  bakery:      { key: "bakery",      label: "Bakery",       icon: "🥐", image: "bakery",      color: "hsl(var(--warning))",  size: "normal", route: "/food?sub=bakery" },
  dineout:     { key: "dineout",     label: "Dine Out",     icon: "🍽️", image: "dineout",     color: "hsl(var(--accent))",   size: "normal", route: "/food?sub=dineout",         subtitle: "Restaurants" },
  beauty:      { key: "beauty",      label: "Beauty",       icon: "💅", image: "beauty",      color: "hsl(var(--accent))",   size: "normal", route: "/services-hub?sub=beauty" },
  concierge:   { key: "concierge",   label: "Concierge",    icon: "🎯", image: "concierge",   color: "hsl(var(--primary))",  size: "normal", route: "/services-hub" },
  mobility:    { key: "mobility",    label: "Rides",        icon: "🏍️", image: "mobility",    color: "hsl(var(--info))",     size: "normal", route: "/ride" },
  rentals:     { key: "rentals",     label: "Rentals",      icon: "🔑", image: "rentals",     color: "hsl(var(--primary))",  size: "normal", route: "/real-estate",              subtitle: "Long-term" },
  stays:       { key: "stays",       label: "Stays",        icon: "🏨", image: "stays",       color: "hsl(var(--accent))",   size: "normal", route: "/travel/stays",             subtitle: "Short-term" },
  travel:      { key: "travel",      label: "Travel",       icon: "✈️", image: "travel",      color: "hsl(var(--info))",     size: "normal", route: "/travel",                   subtitle: "Flights & hotels" },
  healthcare:  { key: "healthcare",  label: "Healthcare",   icon: "💊", image: "healthcare",  color: "hsl(var(--success))",  size: "normal", route: "/healthcare",               subtitle: "Clinics & meds" },
  electronics: { key: "electronics", label: "Electronics",  icon: "📱", image: "electronics", color: "hsl(var(--info))",     size: "normal", route: "/electronics",              subtitle: "Gadgets" },
  gifts:       { key: "gifts",       label: "Gifts",        icon: "🎁", image: "gifts",       color: "hsl(var(--accent))",   size: "normal", route: "/gifts",                    subtitle: "Send love" },
  pharmacy:    { key: "pharmacy",    label: "Pharmacy",     icon: "💊", image: "pharmacy",    color: "hsl(var(--success))",  size: "normal", route: "/healthcare?sub=pharmacy",   subtitle: "Medicines" },
  pets:        { key: "pets",        label: "Pets",         icon: "🐾", image: "pets",        color: "hsl(var(--warning))",  size: "normal", route: "/pets",                     subtitle: "Pet supplies" },
  flowers:     { key: "flowers",     label: "Flowers",      icon: "🌹", image: "flowers",     color: "hsl(var(--accent))",   size: "normal", route: "/gifts?sub=flowers",        subtitle: "Bouquets" },
};

/* ═══ Time-based priority ═══ */
const TIME_PRIORITY: Record<TimeSlot, CategoryKey[]> = {
  morning:   ["coffee", "bakery", "food", "grocery", "pharmacy", "taxi", "services", "healthcare", "travel", "shops", "property"],
  lunch:     ["food", "delivery", "coffee", "shops", "services", "grocery", "travel", "taxi", "property", "electronics"],
  afternoon: ["shops", "services", "grocery", "beauty", "delivery", "electronics", "travel", "property", "food", "wallet", "gifts"],
  dinner:    ["food", "dineout", "grocery", "delivery", "taxi", "travel", "shops", "services", "property", "flowers"],
  latenight: ["food", "delivery", "taxi", "mobility", "pharmacy", "shops", "travel", "wallet", "property", "services"],
};

/* ═══ Country priority overrides ═══ */
const COUNTRY_BOOSTS: Record<string, CategoryKey[]> = {
  AE: ["food", "grocery", "taxi", "beauty", "healthcare", "concierge", "property", "electronics"],
  FR: ["property", "services", "food", "shops", "bakery", "pharmacy"],
  MA: ["food", "services", "mobility", "property", "pharmacy"],
  US: ["food", "grocery", "delivery", "taxi", "shops", "healthcare"],
  GB: ["food", "shops", "property", "delivery", "services"],
  DE: ["property", "services", "shops", "food", "delivery"],
  ES: ["food", "property", "services", "dineout", "shops"],
  IT: ["food", "dineout", "property", "services", "shops"],
  SA: ["food", "grocery", "taxi", "concierge", "beauty", "healthcare"],
  JP: ["food", "shops", "services", "delivery", "mobility", "electronics"],
};

/* ═══ Hero content by time ═══ */
const HERO_BY_TIME: Record<TimeSlot, SmartHero> = {
  morning: {
    title: "Good morning ☀️",
    subtitle: "Breakfast, coffee & bakery near you",
    emoji: "🥐",
    cta: "Order breakfast",
    route: "/food?sub=bakery",
    gradient: "linear-gradient(135deg, hsl(35 90% 55%), hsl(45 95% 65%))",
  },
  lunch: {
    title: "Lunch time 🍱",
    subtitle: "Fast delivery from top spots",
    emoji: "🍕",
    cta: "Order lunch",
    route: "/food",
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
    route: "/food?sub=dineout",
    gradient: "linear-gradient(135deg, hsl(280 60% 45%), hsl(320 65% 50%))",
  },
  latenight: {
    title: "Still open 🌙",
    subtitle: "Late-night eats, rides & delivery",
    emoji: "🌮",
    cta: "Order now",
    route: "/food",
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
  for (const key of Object.keys(ALL_CATEGORIES) as CategoryKey[]) {
    if (!seen.has(key)) { ordered.push(key); seen.add(key); }
  }
  return ordered.map(key => ALL_CATEGORIES[key]);
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
