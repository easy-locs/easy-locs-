/**
 * Global Context Engine — Central intelligence for the entire platform.
 * Computes real-time context from time, location, culture, season, events.
 * Single source of truth consumed by all engines (ranking, boost, UI, commerce).
 */

// ── Types ──

export type TimeSlot = "early_morning" | "morning" | "lunch" | "afternoon" | "dinner" | "late_night";
export type Season = "spring" | "summer" | "autumn" | "winter";

export interface CulturalEvent {
  id: string;
  name: string;
  emoji: string;
  type: "religious" | "national" | "commercial" | "seasonal";
  /** Boosted food subcategories during this event */
  boostedSubs: string[];
  /** Visual accent override */
  accentGradient?: string;
}

export interface GlobalContext {
  /** Time */
  localHour: number;
  timeSlot: TimeSlot;
  dayOfWeek: number; // 0=Sun
  isWeekend: boolean;

  /** Location */
  country: string;
  city: string;
  timezone: string;

  /** Season */
  season: Season;

  /** Cultural / Events */
  activeEvents: CulturalEvent[];
  priorityEvent: CulturalEvent | null;

  /** Commerce signals */
  recommendedSegments: string[];
  promotionType: string | null;

  /** Visual */
  visualTheme: "default" | "ramadan" | "eid" | "christmas" | "summer" | "national_day";

  /** Cache key for memoization */
  cacheKey: string;
}

// ── Time Slot ──

function computeTimeSlot(hour: number): TimeSlot {
  if (hour >= 5 && hour < 9) return "early_morning";
  if (hour >= 9 && hour < 11) return "morning";
  if (hour >= 11 && hour < 15) return "lunch";
  if (hour >= 15 && hour < 18) return "afternoon";
  if (hour >= 18 && hour < 23) return "dinner";
  return "late_night";
}

// ── Season ──

function computeSeason(month: number, country: string): Season {
  // Southern hemisphere inversion
  const southern = ["AU", "NZ", "ZA", "AR", "BR", "CL"].includes(country);
  const offset = southern ? 6 : 0;
  const adjusted = ((month - 1 + offset) % 12) + 1;
  if (adjusted >= 3 && adjusted <= 5) return "spring";
  if (adjusted >= 6 && adjusted <= 8) return "summer";
  if (adjusted >= 9 && adjusted <= 11) return "autumn";
  return "winter";
}

// ── Cultural Events Database ──

const ISLAMIC_COUNTRIES = ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "IQ", "MA", "TN", "DZ", "PK", "TR", "ID", "MY"];
const CHRISTIAN_COUNTRIES = ["US", "GB", "FR", "DE", "IT", "ES", "PT", "CA", "AU", "NZ", "IE", "NL", "BE", "CH", "AT", "PL", "CZ", "SE", "NO", "DK", "FI"];

function detectCulturalEvents(month: number, day: number, country: string): CulturalEvent[] {
  const events: CulturalEvent[] = [];
  const isIslamic = ISLAMIC_COUNTRIES.includes(country);
  const isChristian = CHRISTIAN_COUNTRIES.includes(country);

  // Ramadan (approximate — shifts yearly)
  if (isIslamic && ((month === 3 && day >= 10) || (month === 4 && day <= 21))) {
    events.push({
      id: "ramadan", name: "Ramadan", emoji: "🌙", type: "religious",
      boostedSubs: ["iftar", "suhoor", "family_meals", "desserts", "dates", "beverages", "arabic", "lebanese", "turkish"],
      accentGradient: "linear-gradient(135deg, hsl(260 40% 25% / 0.12), hsl(45 80% 55% / 0.08))",
    });
  }

  // Eid al-Fitr
  if (isIslamic && month === 4 && day >= 22 && day <= 25) {
    events.push({
      id: "eid_fitr", name: "Eid al-Fitr", emoji: "🕌", type: "religious",
      boostedSubs: ["desserts", "family_meals", "gifts", "sweets", "bakery", "celebration"],
      accentGradient: "linear-gradient(135deg, hsl(45 90% 55% / 0.15), hsl(30 80% 50% / 0.1))",
    });
  }

  // Eid al-Adha
  if (isIslamic && month === 6 && day >= 15 && day <= 19) {
    events.push({
      id: "eid_adha", name: "Eid al-Adha", emoji: "🐑", type: "religious",
      boostedSubs: ["meat", "grill", "family_meals", "gifts", "celebration"],
    });
  }

  // Christmas
  if (isChristian && month === 12 && day >= 20 && day <= 26) {
    events.push({
      id: "christmas", name: "Christmas", emoji: "🎄", type: "religious",
      boostedSubs: ["gifts", "desserts", "bakery", "wine", "celebration", "dineout"],
      accentGradient: "linear-gradient(135deg, hsl(0 70% 45% / 0.1), hsl(120 50% 35% / 0.08))",
    });
  }

  // New Year
  if ((month === 12 && day >= 30) || (month === 1 && day <= 2)) {
    events.push({
      id: "new_year", name: "New Year", emoji: "🎆", type: "commercial",
      boostedSubs: ["celebration", "dineout", "premium", "drinks", "desserts"],
    });
  }

  // UAE National Day
  if (country === "AE" && month === 12 && day >= 1 && day <= 3) {
    events.push({
      id: "uae_national_day", name: "UAE National Day", emoji: "🇦🇪", type: "national",
      boostedSubs: ["local", "arabic", "emirati", "celebration"],
      accentGradient: "linear-gradient(135deg, hsl(0 70% 50% / 0.1), hsl(120 60% 40% / 0.1))",
    });
  }

  // Valentine's Day
  if (month === 2 && day >= 12 && day <= 14) {
    events.push({
      id: "valentines", name: "Valentine's Day", emoji: "💝", type: "commercial",
      boostedSubs: ["flowers", "gifts", "desserts", "dineout", "premium", "chocolate"],
    });
  }

  // Black Friday (approximate)
  if (month === 11 && day >= 24 && day <= 30) {
    events.push({
      id: "black_friday", name: "Black Friday", emoji: "🏷️", type: "commercial",
      boostedSubs: ["electronics", "shops", "deals", "fashion"],
    });
  }

  return events;
}

// ── Recommended Segments by TimeSlot ──

const SEGMENT_MAP: Record<TimeSlot, string[]> = {
  early_morning: ["coffee", "bakery", "healthy", "cafe"],
  morning: ["breakfast", "coffee", "bakery", "brunch", "healthy"],
  lunch: ["fast_food", "restaurant", "healthy", "combo", "delivery", "shawarma", "wraps"],
  afternoon: ["cafe", "desserts", "snacks", "beverages", "bakery"],
  dinner: ["restaurant", "dineout", "pizza", "sushi", "seafood", "premium", "family_meals"],
  late_night: ["fast_food", "pizza", "burgers", "shawarma", "delivery", "ready_to_eat"],
};

// ── Visual Theme ──

function resolveVisualTheme(events: CulturalEvent[], season: Season): GlobalContext["visualTheme"] {
  const eventIds = events.map(e => e.id);
  if (eventIds.includes("ramadan")) return "ramadan";
  if (eventIds.includes("eid_fitr") || eventIds.includes("eid_adha")) return "eid";
  if (eventIds.includes("christmas")) return "christmas";
  if (eventIds.includes("uae_national_day")) return "national_day";
  if (season === "summer") return "summer";
  return "default";
}

// ── Main Compute ──

export interface ContextInput {
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
}

let _cache: { key: string; ctx: GlobalContext } | null = null;

export function computeGlobalContext(input: ContextInput = {}): GlobalContext {
  const now = new Date();
  const hour = now.getHours();
  const month = now.getMonth() + 1;
  const day = now.getDate();
  const dayOfWeek = now.getDay();
  const country = (input.country || "AE").toUpperCase();
  const city = input.city || "Dubai";
  const timezone = input.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Cache key: changes every 15 min
  const cacheKey = `${country}-${city}-${hour}-${Math.floor(now.getMinutes() / 15)}-${month}-${day}`;
  if (_cache?.key === cacheKey) return _cache.ctx;

  const timeSlot = computeTimeSlot(hour);
  const season = computeSeason(month, country);
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6 || (ISLAMIC_COUNTRIES.includes(country) && (dayOfWeek === 5 || dayOfWeek === 6));

  const activeEvents = detectCulturalEvents(month, day, country);
  const priorityEvent = activeEvents.length > 0 ? activeEvents[0] : null;

  // Merge recommended segments from time + events
  const baseSegments = [...SEGMENT_MAP[timeSlot]];
  for (const evt of activeEvents) {
    for (const sub of evt.boostedSubs) {
      if (!baseSegments.includes(sub)) baseSegments.push(sub);
    }
  }

  const visualTheme = resolveVisualTheme(activeEvents, season);

  const promotionType = priorityEvent?.type === "commercial" ? "deal"
    : priorityEvent?.type === "religious" ? "special"
    : isWeekend ? "weekend" : null;

  const ctx: GlobalContext = {
    localHour: hour,
    timeSlot,
    dayOfWeek,
    isWeekend,
    country,
    city,
    timezone,
    season,
    activeEvents,
    priorityEvent,
    recommendedSegments: baseSegments,
    promotionType,
    visualTheme,
    cacheKey,
  };

  _cache = { key: cacheKey, ctx };
  return ctx;
}

/** Check if a subcategory is boosted in current context */
export function isContextBoosted(subcategory: string, ctx?: GlobalContext): boolean {
  const c = ctx || computeGlobalContext();
  return c.recommendedSegments.includes(subcategory);
}

/** Get context boost score (0-1) for ranking integration */
export function contextBoostScore(subcategory: string | null | undefined, ctx?: GlobalContext): number {
  if (!subcategory) return 0;
  const c = ctx || computeGlobalContext();
  const idx = c.recommendedSegments.indexOf(subcategory);
  if (idx === -1) return 0;
  // Higher score for segments listed earlier (more relevant)
  return Math.max(0.1, 1 - (idx / c.recommendedSegments.length));
}
