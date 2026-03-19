/**
 * Market Design Profiles — Per-region visual adaptation rules.
 * Controls density, spacing scale, typography, RTL, imagery, and CTA style.
 */

export type MarketRegion = "europe" | "americas" | "middle_east" | "asia_pacific" | "africa";
export type WritingDirection = "ltr" | "rtl";
export type DensityLevel = "compact" | "standard" | "spacious";

export interface MarketDesignProfile {
  region: MarketRegion;
  direction: WritingDirection;
  density: DensityLevel;
  spacingScale: number;       // multiplier (1 = default 4px base)
  fontSizeScale: number;      // multiplier (1 = default)
  cardRadius: string;         // CSS value
  cardPadding: string;        // CSS value
  imageRatio: string;         // aspect-ratio CSS
  ctaStyle: "bold" | "subtle" | "editorial";
  trustSignals: boolean;      // show trust badges, reviews prominently
  premiumFeel: boolean;       // extra shadows, glass, gradients
  formLayout: "stacked" | "inline"; // default form field layout
}

const RTL_LANGUAGES = new Set(["ar", "he", "fa", "ur", "ps", "ku", "sd", "yi"]);

export function isRtlLanguage(lang: string): boolean {
  return RTL_LANGUAGES.has(lang.toLowerCase().split("-")[0]);
}

export function getWritingDirection(lang: string): WritingDirection {
  return isRtlLanguage(lang) ? "rtl" : "ltr";
}

const PROFILES: Record<MarketRegion, MarketDesignProfile> = {
  europe: {
    region: "europe",
    direction: "ltr",
    density: "standard",
    spacingScale: 1,
    fontSizeScale: 1,
    cardRadius: "var(--card-radius)",
    cardPadding: "var(--card-padding)",
    imageRatio: "16/9",
    ctaStyle: "editorial",
    trustSignals: false,
    premiumFeel: false,
    formLayout: "stacked",
  },
  americas: {
    region: "americas",
    direction: "ltr",
    density: "standard",
    spacingScale: 1,
    fontSizeScale: 1.02,
    cardRadius: "var(--card-radius)",
    cardPadding: "var(--card-padding)",
    imageRatio: "16/9",
    ctaStyle: "bold",
    trustSignals: true,
    premiumFeel: false,
    formLayout: "stacked",
  },
  middle_east: {
    region: "middle_east",
    direction: "rtl",
    density: "spacious",
    spacingScale: 1.1,
    fontSizeScale: 1.05,
    cardRadius: "1rem",
    cardPadding: "1.25rem",
    imageRatio: "4/3",
    ctaStyle: "bold",
    trustSignals: true,
    premiumFeel: true,
    formLayout: "stacked",
  },
  asia_pacific: {
    region: "asia_pacific",
    direction: "ltr",
    density: "compact",
    spacingScale: 0.9,
    fontSizeScale: 0.98,
    cardRadius: "var(--card-radius)",
    cardPadding: "0.75rem",
    imageRatio: "4/3",
    ctaStyle: "subtle",
    trustSignals: true,
    premiumFeel: false,
    formLayout: "inline",
  },
  africa: {
    region: "africa",
    direction: "ltr",
    density: "standard",
    spacingScale: 1,
    fontSizeScale: 1,
    cardRadius: "var(--card-radius)",
    cardPadding: "var(--card-padding)",
    imageRatio: "16/9",
    ctaStyle: "bold",
    trustSignals: true,
    premiumFeel: false,
    formLayout: "stacked",
  },
};

/**
 * Returns the design profile for a given market region.
 * Overrides direction based on actual language if needed.
 */
export function getMarketProfile(region: MarketRegion, language?: string): MarketDesignProfile {
  const profile = { ...PROFILES[region] };
  if (language) {
    profile.direction = getWritingDirection(language);
  }
  return profile;
}

/**
 * Returns region from country code using the global registry region field.
 */
export function regionFromCountryCode(countryCode: string): MarketRegion {
  const regionMap: Record<string, MarketRegion> = {
    europe: "europe",
    americas: "americas",
    middle_east: "middle_east",
    asia_pacific: "asia_pacific",
    africa: "africa",
  };
  // Dynamic lookup deferred to avoid circular import; caller can pass region directly
  return regionMap[countryCode] || "europe";
}

/**
 * CSS custom properties for the active market profile.
 * Apply these to root or page shell to adapt layout.
 */
export function marketProfileToCssVars(profile: MarketDesignProfile): Record<string, string> {
  return {
    "--market-spacing-scale": String(profile.spacingScale),
    "--market-font-scale": String(profile.fontSizeScale),
    "--market-card-radius": profile.cardRadius,
    "--market-card-padding": profile.cardPadding,
    "--market-image-ratio": profile.imageRatio,
    "--market-direction": profile.direction,
  };
}
