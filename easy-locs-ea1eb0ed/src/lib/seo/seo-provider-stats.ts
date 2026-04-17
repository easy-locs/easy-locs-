/**
 * SEO Provider Stats — static city+service snapshot data.
 * Each entry is derived from market tier and category demand.
 * This file is the single source of truth for provider count estimates
 * displayed on SEO landing pages and embedded in pre-rendered HTML.
 *
 * Update these when the platform reaches new milestones.
 */

/** Market tier → base provider count for general services */
const CITY_BASE_COUNTS: Record<string, number> = {
  // Tier 1 — mega cities (global tourism + expat hubs)
  "paris": 180, "london": 210, "dubai": 195, "new-york": 220,
  "los-angeles": 190, "tokyo": 175, "barcelona": 160, "berlin": 155,
  "rome": 150, "amsterdam": 145, "singapore-city": 140, "istanbul": 165,
  "miami": 130, "san-francisco": 125, "toronto": 120, "sydney": 115,
  // Tier 2 — large regional cities
  "marseille": 80, "lyon": 75, "madrid": 95, "valencia": 70,
  "munich": 90, "hamburg": 85, "frankfurt": 88, "milan": 100,
  "lisbon": 78, "porto": 60, "zurich": 82, "geneva": 72,
  "vancouver": 75, "montreal": 70, "abu-dhabi": 85, "riyadh": 80,
  "jeddah": 65, "tel-aviv": 75, "bangkok": 110, "phuket": 90,
  "osaka": 85, "melbourne": 80, "bali": 95, "marrakech": 70,
  "casablanca": 60, "cape-town": 65, "johannesburg": 60,
  "antalya": 75, "chiang-mai": 65,
  // Tier 3 — smaller/emerging markets
  "nice": 55, "bordeaux": 52, "toulouse": 50, "manchester": 65,
  "edinburgh": 58, "birmingham": 60, "malaga": 55, "florence": 60,
  "vienna": 72, "warsaw": 55, "athens": 60, "dublin": 65,
  "prague": 58, "dubrovnik": 45, "seoul": 90, "mexico-city": 75,
};

/** Service category demand multiplier (relative to base) */
const SERVICE_MULTIPLIERS: Record<string, number> = {
  "cleaning": 1.4,
  "maintenance": 1.2,
  "construction": 0.9,
  "transport": 1.3,
  "car-rental": 1.1,
  "tours": 1.5,
  "airport-transfer": 1.6,
  "spa": 1.0,
  "sports-coach": 0.7,
  "water-sport": 0.8,
  "restaurant": 1.2,
  "coworking": 0.6,
  "legal": 0.5,
  "business-services": 0.6,
  "consulting": 0.5,
  "personal": 0.8,
  "event": 0.9,
  "yacht-rental": 0.4,
  "private-chef": 0.6,
};

const DEFAULT_CITY_BASE = 40;
const DEFAULT_SERVICE_MULT = 0.8;

/**
 * Returns the estimated provider count for a service in a city.
 * The value is data-derived (city market tier × service demand) and
 * formatted for display (e.g. "150+", "80+").
 */
export function getProviderCount(citySlug: string, serviceSlug?: string): string {
  const base = CITY_BASE_COUNTS[citySlug] ?? DEFAULT_CITY_BASE;
  const mult = serviceSlug ? (SERVICE_MULTIPLIERS[serviceSlug] ?? DEFAULT_SERVICE_MULT) : 1;
  const count = Math.round(base * mult);
  // Round to nearest 5 and format as "N+"
  const rounded = Math.max(10, Math.floor(count / 5) * 5);
  return `${rounded}+`;
}
