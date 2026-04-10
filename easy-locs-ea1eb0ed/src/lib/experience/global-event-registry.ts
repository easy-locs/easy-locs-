/**
 * GLOBAL EVENT REGISTRY
 * Centralized world event database — extensible, not hardcoded in pages.
 * Consumed by the experience orchestrator to detect active events.
 */

import type { ExperienceEvent } from "./global-experience-types";

interface EventDefinition {
  id: string;
  name: string;
  emoji: string;
  type: ExperienceEvent["type"];
  themeKey: string;
  /** Countries where this event is active. Empty = global. */
  countries: string[];
  /** Month-day ranges: [startMonth, startDay, endMonth, endDay] */
  periods: [number, number, number, number][];
}

// ── Registry ──

const REGISTRY: EventDefinition[] = [
  // ── MENA / GCC ──
  {
    id: "ramadan", name: "Ramadan", emoji: "🌙", type: "religious", themeKey: "ramadan",
    countries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "IQ", "MA", "TN", "DZ", "PK", "TR", "ID", "MY"],
    periods: [[3, 10, 4, 21]], // Approximate — shifts yearly
  },
  {
    id: "eid_fitr", name: "Eid al-Fitr", emoji: "🕌", type: "religious", themeKey: "eid",
    countries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "IQ", "MA", "TN", "DZ", "PK", "TR", "ID", "MY"],
    periods: [[4, 22, 4, 25]],
  },
  {
    id: "eid_adha", name: "Eid al-Adha", emoji: "🐑", type: "religious", themeKey: "eid",
    countries: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "JO", "LB", "IQ", "MA", "TN", "DZ", "PK", "TR", "ID", "MY"],
    periods: [[6, 15, 6, 19]],
  },
  {
    id: "uae_national_day", name: "UAE National Day", emoji: "🇦🇪", type: "national", themeKey: "national_day",
    countries: ["AE"],
    periods: [[12, 1, 12, 3]],
  },
  {
    id: "saudi_national_day", name: "Saudi National Day", emoji: "🇸🇦", type: "national", themeKey: "national_day",
    countries: ["SA"],
    periods: [[9, 23, 9, 24]],
  },

  // ── Global Commercial ──
  {
    id: "new_year", name: "New Year", emoji: "🎆", type: "commercial", themeKey: "default",
    countries: [],
    periods: [[12, 30, 12, 31], [1, 1, 1, 2]],
  },
  {
    id: "valentines", name: "Valentine's Day", emoji: "💝", type: "commercial", themeKey: "default",
    countries: [],
    periods: [[2, 12, 2, 14]],
  },
  {
    id: "black_friday", name: "Black Friday", emoji: "🏷️", type: "commercial", themeKey: "default",
    countries: [],
    periods: [[11, 24, 11, 30]],
  },
  {
    id: "cyber_monday", name: "Cyber Monday", emoji: "💻", type: "commercial", themeKey: "default",
    countries: [],
    periods: [[12, 1, 12, 2]],
  },
  {
    id: "back_to_school", name: "Back to School", emoji: "📚", type: "seasonal", themeKey: "default",
    countries: [],
    periods: [[8, 20, 9, 15]],
  },
  {
    id: "summer_deals", name: "Summer Deals", emoji: "☀️", type: "seasonal", themeKey: "summer",
    countries: [],
    periods: [[6, 1, 8, 31]],
  },

  // ── Europe / West ──
  {
    id: "christmas", name: "Christmas", emoji: "🎄", type: "religious", themeKey: "christmas",
    countries: ["US", "GB", "FR", "DE", "IT", "ES", "PT", "CA", "AU", "NZ", "IE", "NL", "BE", "CH", "AT", "PL", "CZ", "SE", "NO", "DK", "FI"],
    periods: [[12, 20, 12, 26]],
  },
  {
    id: "easter", name: "Easter", emoji: "🐣", type: "religious", themeKey: "default",
    countries: ["US", "GB", "FR", "DE", "IT", "ES", "PT", "CA", "AU", "NZ", "IE", "NL", "BE", "CH", "AT", "PL", "CZ", "SE", "NO", "DK", "FI"],
    periods: [[3, 28, 4, 5]], // Approximate
  },

  // ── Asia ──
  {
    id: "lunar_new_year", name: "Lunar New Year", emoji: "🧧", type: "religious", themeKey: "default",
    countries: ["CN", "HK", "TW", "SG", "VN", "KR", "MY", "ID", "TH"],
    periods: [[1, 20, 2, 10]],
  },
  {
    id: "diwali", name: "Diwali", emoji: "🪔", type: "religious", themeKey: "default",
    countries: ["IN", "NP", "LK", "SG", "MY"],
    periods: [[10, 20, 11, 5]],
  },
  {
    id: "singles_day", name: "Singles Day", emoji: "🛒", type: "commercial", themeKey: "default",
    countries: ["CN", "HK", "TW", "SG"],
    periods: [[11, 11, 11, 11]],
  },
];

// ── Resolver ──

function isInPeriod(month: number, day: number, periods: [number, number, number, number][]): boolean {
  for (const [sm, sd, em, ed] of periods) {
    if (sm === em) {
      if (month === sm && day >= sd && day <= ed) return true;
    } else {
      // Cross-month: start-month after startDay OR end-month before endDay
      if (month === sm && day >= sd) return true;
      if (month === em && day <= ed) return true;
      if (month > sm && month < em) return true;
    }
  }
  return false;
}

export function resolveActiveEvents(country: string, month: number, day: number): ExperienceEvent[] {
  const uc = country.toUpperCase();
  return REGISTRY
    .filter(def => {
      const countryMatch = def.countries.length === 0 || def.countries.includes(uc);
      return countryMatch && isInPeriod(month, day, def.periods);
    })
    .map(def => ({
      id: def.id,
      type: def.type,
      name: def.name,
      emoji: def.emoji,
      priority: def.type === "religious" ? 95 : def.type === "national" ? 90 : def.type === "commercial" ? 70 : 50,
      themeKey: def.themeKey,
      country: uc,
    }))
    .sort((a, b) => b.priority - a.priority);
}
