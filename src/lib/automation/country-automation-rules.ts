/**
 * Country-Aware Automation Rules
 * Behavior varies by market for outreach, dispatch, settlement, etc.
 */

export interface CountryAutomationConfig {
  locale: string;
  messageLanguages: string[];
  outreachChannelPriority: string[];
  dispatchRetryAggressiveness: "low" | "medium" | "high";
  selfDeliveryFallback: boolean;
  settlementRetryDelayMinutes: number[];
  inactivityThresholdDays: number;
  premiumMarketOverrides: boolean;
  urgencyCadenceMultiplier: number;
}

const COUNTRY_CONFIGS: Record<string, CountryAutomationConfig> = {
  AE: {
    locale: "ar-AE",
    messageLanguages: ["en", "ar"],
    outreachChannelPriority: ["whatsapp", "sms", "email"],
    dispatchRetryAggressiveness: "high",
    selfDeliveryFallback: true,
    settlementRetryDelayMinutes: [3, 15, 45],
    inactivityThresholdDays: 21,
    premiumMarketOverrides: true,
    urgencyCadenceMultiplier: 0.8,
  },
  FR: {
    locale: "fr-FR",
    messageLanguages: ["fr", "en"],
    outreachChannelPriority: ["email", "sms", "whatsapp"],
    dispatchRetryAggressiveness: "medium",
    selfDeliveryFallback: true,
    settlementRetryDelayMinutes: [5, 30, 60],
    inactivityThresholdDays: 30,
    premiumMarketOverrides: false,
    urgencyCadenceMultiplier: 1.2,
  },
  TH: {
    locale: "th-TH",
    messageLanguages: ["en", "th"],
    outreachChannelPriority: ["whatsapp", "sms"],
    dispatchRetryAggressiveness: "medium",
    selfDeliveryFallback: true,
    settlementRetryDelayMinutes: [5, 30, 60],
    inactivityThresholdDays: 30,
    premiumMarketOverrides: false,
    urgencyCadenceMultiplier: 1.0,
  },
};

const DEFAULT_CONFIG: CountryAutomationConfig = {
  locale: "en-US",
  messageLanguages: ["en"],
  outreachChannelPriority: ["whatsapp", "email", "sms"],
  dispatchRetryAggressiveness: "medium",
  selfDeliveryFallback: true,
  settlementRetryDelayMinutes: [5, 30, 60],
  inactivityThresholdDays: 30,
  premiumMarketOverrides: false,
  urgencyCadenceMultiplier: 1.0,
};

export function getCountryAutomationConfig(countryCode?: string | null): CountryAutomationConfig {
  if (!countryCode) return DEFAULT_CONFIG;
  return COUNTRY_CONFIGS[countryCode.toUpperCase()] ?? DEFAULT_CONFIG;
}

/**
 * Adjust workflow step delays based on country cadence.
 */
export function adjustStepDelays(
  steps: { delayMinutes: number; [k: string]: unknown }[],
  countryCode?: string | null
): typeof steps {
  const config = getCountryAutomationConfig(countryCode);
  return steps.map((s) => ({
    ...s,
    delayMinutes: Math.round(s.delayMinutes * config.urgencyCadenceMultiplier),
  }));
}
