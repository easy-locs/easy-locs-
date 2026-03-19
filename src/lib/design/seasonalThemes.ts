/**
 * Seasonal Theme Engine — Dynamic accent/theme adaptation for events & holidays.
 * Subtly adjusts accent colors, banners, and decorative elements.
 */

export interface SeasonalTheme {
  id: string;
  name: string;
  startMonth: number; // 1-12
  startDay: number;
  endMonth: number;
  endDay: number;
  regions: string[];    // country codes or "all"
  accentHsl: string;    // HSL override for accent
  badgeEmoji?: string;
  bannerText?: string;
  subtle: boolean;      // true = only accent shift, false = banner + decorations
}

export const SEASONAL_THEMES: SeasonalTheme[] = [
  {
    id: "ramadan",
    name: "Ramadan",
    startMonth: 3, startDay: 1, endMonth: 4, endDay: 15,
    regions: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "MA", "TN", "DZ", "LB", "JO", "IQ", "PK", "TR", "MY", "ID"],
    accentHsl: "45 80% 55%",
    badgeEmoji: "🌙",
    bannerText: "Ramadan Mubarak",
    subtle: false,
  },
  {
    id: "eid_fitr",
    name: "Eid al-Fitr",
    startMonth: 4, startDay: 10, endMonth: 4, endDay: 15,
    regions: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "MA", "TN", "DZ", "LB", "JO", "IQ", "PK", "TR", "MY", "ID"],
    accentHsl: "140 60% 50%",
    badgeEmoji: "🎉",
    bannerText: "Eid Mubarak",
    subtle: false,
  },
  {
    id: "christmas",
    name: "Christmas",
    startMonth: 12, startDay: 15, endMonth: 12, endDay: 31,
    regions: ["all"],
    accentHsl: "0 72% 50%",
    badgeEmoji: "🎄",
    bannerText: undefined,
    subtle: true,
  },
  {
    id: "new_year",
    name: "New Year",
    startMonth: 1, startDay: 1, endMonth: 1, endDay: 5,
    regions: ["all"],
    accentHsl: "45 90% 55%",
    badgeEmoji: "🎆",
    bannerText: undefined,
    subtle: true,
  },
  {
    id: "black_friday",
    name: "Black Friday",
    startMonth: 11, startDay: 20, endMonth: 11, endDay: 30,
    regions: ["all"],
    accentHsl: "0 0% 10%",
    badgeEmoji: "🏷️",
    bannerText: undefined,
    subtle: true,
  },
  {
    id: "valentines",
    name: "Valentine's Day",
    startMonth: 2, startDay: 10, endMonth: 2, endDay: 15,
    regions: ["all"],
    accentHsl: "340 80% 60%",
    badgeEmoji: "💝",
    bannerText: undefined,
    subtle: true,
  },
  {
    id: "uae_national_day",
    name: "UAE National Day",
    startMonth: 12, startDay: 1, endMonth: 12, endDay: 4,
    regions: ["AE"],
    accentHsl: "0 72% 45%",
    badgeEmoji: "🇦🇪",
    bannerText: undefined,
    subtle: false,
  },
  {
    id: "bastille_day",
    name: "Fête nationale",
    startMonth: 7, startDay: 14, endMonth: 7, endDay: 15,
    regions: ["FR"],
    accentHsl: "220 70% 50%",
    badgeEmoji: "🇫🇷",
    bannerText: undefined,
    subtle: true,
  },
];

/**
 * Returns the active seasonal theme for a given date and country.
 */
export function getActiveTheme(countryCode: string, date: Date = new Date()): SeasonalTheme | null {
  const month = date.getMonth() + 1;
  const day = date.getDate();

  for (const theme of SEASONAL_THEMES) {
    const regionMatch = theme.regions.includes("all") || theme.regions.includes(countryCode);
    if (!regionMatch) continue;

    // Handle same-year range
    const afterStart = month > theme.startMonth || (month === theme.startMonth && day >= theme.startDay);
    const beforeEnd = month < theme.endMonth || (month === theme.endMonth && day <= theme.endDay);

    if (theme.startMonth <= theme.endMonth) {
      if (afterStart && beforeEnd) return theme;
    } else {
      // Cross-year (e.g., Dec → Jan)
      if (afterStart || beforeEnd) return theme;
    }
  }
  return null;
}

/**
 * Returns CSS variables for the active seasonal theme.
 */
export function seasonalCssVars(theme: SeasonalTheme | null): Record<string, string> {
  if (!theme) return {};
  return {
    "--seasonal-accent": theme.accentHsl,
    "--seasonal-active": "1",
  };
}
