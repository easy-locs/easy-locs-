/**
 * DINO V8 — Multi-Country Control System
 * Manages country-specific rules, legal constraints, and localized behavior.
 */

export interface CountryRule {
  country: string;
  language: string[];
  currency: string;
  direction: "ltr" | "rtl";
  timezone: string;
  legalConstraints: string[];
  uxPreferences: {
    density: "compact" | "normal" | "spacious";
    animationLevel: "minimal" | "standard" | "rich";
    colorScheme: "light" | "dark" | "auto";
  };
  marketRules: {
    maxBoostPerCategory: number;
    minQualityToPublish: number;
    requiresVerification: boolean;
    allowedPaymentMethods: string[];
  };
}

const COUNTRY_RULES: Record<string, CountryRule> = {
  FR: {
    country: "FR", language: ["fr", "en"], currency: "EUR", direction: "ltr", timezone: "Europe/Paris",
    legalConstraints: ["GDPR", "consumer_protection"],
    uxPreferences: { density: "spacious", animationLevel: "standard", colorScheme: "auto" },
    marketRules: { maxBoostPerCategory: 3, minQualityToPublish: 40, requiresVerification: false, allowedPaymentMethods: ["card", "apple_pay", "google_pay"] },
  },
  AE: {
    country: "AE", language: ["ar", "en"], currency: "AED", direction: "rtl", timezone: "Asia/Dubai",
    legalConstraints: ["DED_license", "food_safety"],
    uxPreferences: { density: "normal", animationLevel: "rich", colorScheme: "auto" },
    marketRules: { maxBoostPerCategory: 5, minQualityToPublish: 50, requiresVerification: true, allowedPaymentMethods: ["card", "apple_pay", "cash"] },
  },
  TH: {
    country: "TH", language: ["th", "en"], currency: "THB", direction: "ltr", timezone: "Asia/Bangkok",
    legalConstraints: ["food_license"],
    uxPreferences: { density: "compact", animationLevel: "standard", colorScheme: "auto" },
    marketRules: { maxBoostPerCategory: 4, minQualityToPublish: 35, requiresVerification: false, allowedPaymentMethods: ["card", "promptpay", "cash"] },
  },
  US: {
    country: "US", language: ["en", "es"], currency: "USD", direction: "ltr", timezone: "America/New_York",
    legalConstraints: ["health_permit", "ADA_compliance"],
    uxPreferences: { density: "normal", animationLevel: "standard", colorScheme: "auto" },
    marketRules: { maxBoostPerCategory: 5, minQualityToPublish: 45, requiresVerification: false, allowedPaymentMethods: ["card", "apple_pay", "google_pay"] },
  },
  SA: {
    country: "SA", language: ["ar", "en"], currency: "SAR", direction: "rtl", timezone: "Asia/Riyadh",
    legalConstraints: ["CR_license", "food_authority"],
    uxPreferences: { density: "normal", animationLevel: "rich", colorScheme: "auto" },
    marketRules: { maxBoostPerCategory: 4, minQualityToPublish: 50, requiresVerification: true, allowedPaymentMethods: ["card", "mada", "apple_pay", "stc_pay"] },
  },
};

export function getCountryRule(country: string): CountryRule | undefined {
  return COUNTRY_RULES[country];
}

export function getAllCountryRules(): CountryRule[] {
  return Object.values(COUNTRY_RULES);
}

export function getMarketRuleForCountry(country: string) {
  return COUNTRY_RULES[country]?.marketRules ?? COUNTRY_RULES.FR.marketRules;
}

export function getUxPreferencesForCountry(country: string) {
  return COUNTRY_RULES[country]?.uxPreferences ?? COUNTRY_RULES.FR.uxPreferences;
}
