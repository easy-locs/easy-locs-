/**
 * DINO V5 — Global Design Auto-Adaptation Engine
 * Adapts UI/UX per country, culture, season, and event.
 */

export type SeasonalTheme = "default" | "ramadan" | "christmas" | "lunar_new_year" | "diwali" | "eid";
export type LayoutDensity = "compact" | "normal" | "spacious";
export type WritingDirection = "ltr" | "rtl";

export interface MarketProfile {
  country: string;
  language: string;
  direction: WritingDirection;
  density: LayoutDensity;
  activeTheme: SeasonalTheme;
  timezone: string;
}

export interface DesignAdaptation {
  theme: SeasonalTheme;
  density: LayoutDensity;
  direction: WritingDirection;
  cardGap: number;       // px
  fontSize: number;      // base rem multiplier
  ctaStyle: "primary" | "accent" | "warm";
  heroStyle: "standard" | "festive" | "minimal";
  colorOverrides: Record<string, string>;
}

const SEASONAL_CALENDAR: Record<string, { theme: SeasonalTheme; months: number[]; regions: string[] }[]> = {
  ramadan: [{ theme: "ramadan", months: [2, 3, 4], regions: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "MA", "TN", "DZ"] }],
  christmas: [{ theme: "christmas", months: [12, 1], regions: ["FR", "US", "GB", "DE", "ES", "IT", "CA", "AU"] }],
  lunar_new_year: [{ theme: "lunar_new_year", months: [1, 2], regions: ["CN", "VN", "TH", "KR", "SG", "MY"] }],
  diwali: [{ theme: "diwali", months: [10, 11], regions: ["IN", "NP", "LK"] }],
  eid: [{ theme: "eid", months: [4, 5, 6], regions: ["AE", "SA", "QA", "KW", "BH", "OM", "EG", "MA"] }],
};

const DENSITY_MAP: Record<string, LayoutDensity> = {
  CN: "compact", JP: "compact", KR: "compact", TH: "compact", VN: "compact", SG: "compact",
  FR: "spacious", US: "normal", GB: "spacious", DE: "spacious", AE: "normal", SA: "normal",
};

const RTL_COUNTRIES = new Set(["AE", "SA", "QA", "KW", "BH", "OM", "EG", "MA", "TN", "DZ", "IQ", "JO", "LB", "PS", "YE", "SD", "LY", "SY"]);

export function detectSeasonalTheme(country: string): SeasonalTheme {
  const month = new Date().getMonth() + 1;
  for (const entries of Object.values(SEASONAL_CALENDAR)) {
    for (const entry of entries) {
      if (entry.regions.includes(country) && entry.months.includes(month)) {
        return entry.theme;
      }
    }
  }
  return "default";
}

export function buildMarketProfile(country: string, language: string): MarketProfile {
  return {
    country,
    language,
    direction: RTL_COUNTRIES.has(country) ? "rtl" : "ltr",
    density: DENSITY_MAP[country] ?? "normal",
    activeTheme: detectSeasonalTheme(country),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  };
}

export function computeDesignAdaptation(profile: MarketProfile): DesignAdaptation {
  const base: DesignAdaptation = {
    theme: profile.activeTheme,
    density: profile.density,
    direction: profile.direction,
    cardGap: profile.density === "compact" ? 8 : profile.density === "spacious" ? 16 : 12,
    fontSize: profile.density === "compact" ? 0.9 : 1,
    ctaStyle: "primary",
    heroStyle: "standard",
    colorOverrides: {},
  };

  switch (profile.activeTheme) {
    case "ramadan":
      base.ctaStyle = "warm";
      base.heroStyle = "festive";
      base.colorOverrides = { "--accent": "45 80% 55%", "--card": "220 20% 12%" };
      break;
    case "christmas":
      base.ctaStyle = "warm";
      base.heroStyle = "festive";
      base.colorOverrides = { "--accent": "0 70% 50%", "--primary": "140 60% 35%" };
      break;
    case "lunar_new_year":
      base.ctaStyle = "accent";
      base.heroStyle = "festive";
      base.colorOverrides = { "--accent": "0 80% 50%", "--primary": "45 90% 50%" };
      break;
    case "diwali":
      base.ctaStyle = "accent";
      base.heroStyle = "festive";
      base.colorOverrides = { "--accent": "35 90% 55%", "--primary": "280 60% 50%" };
      break;
  }

  return base;
}
