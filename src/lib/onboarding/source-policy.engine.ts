/**
 * Source Policy Engine — Decides which data sources are authorized per vertical.
 * Each vertical has its own allowed, primary, fallback, and forbidden source lists.
 * No scraping chaos: only the right sources for the right business type.
 */

export type OnboardingVertical = "food" | "grocery" | "hotel" | "services" | "property";

export interface SourcePolicy {
  vertical: OnboardingVertical;
  allowedSources: string[];
  primarySources: string[];
  fallbackSources: string[];
  forbiddenSources: string[];
}

export const SOURCE_POLICIES: Record<OnboardingVertical, SourcePolicy> = {
  food: {
    vertical: "food",
    allowedSources: ["deliveroo", "talabat", "careem", "noon", "official_web", "google_business"],
    primarySources: ["deliveroo", "talabat", "careem", "noon"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["booking", "expedia", "govoyage", "property_portal"],
  },
  grocery: {
    vertical: "grocery",
    allowedSources: ["talabat", "careem", "noon", "official_web", "google_business"],
    primarySources: ["talabat", "careem", "noon"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["booking", "expedia", "govoyage", "property_portal"],
  },
  hotel: {
    vertical: "hotel",
    allowedSources: ["booking", "expedia", "govoyage", "official_web", "google_business"],
    primarySources: ["booking", "expedia", "govoyage"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["deliveroo", "talabat", "careem", "noon", "property_portal"],
  },
  services: {
    vertical: "services",
    allowedSources: ["official_web", "google_business", "trusted_directory"],
    primarySources: ["official_web", "google_business"],
    fallbackSources: ["trusted_directory"],
    forbiddenSources: ["booking", "expedia", "deliveroo", "talabat", "noon", "property_portal"],
  },
  property: {
    vertical: "property",
    allowedSources: ["property_portal", "official_web", "crm_import", "google_business"],
    primarySources: ["property_portal", "crm_import"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["deliveroo", "talabat", "careem", "noon", "booking", "expedia"],
  },
};

/** Get all allowed sources for a vertical */
export function getSourcesForVertical(vertical: OnboardingVertical): string[] {
  return SOURCE_POLICIES[vertical]?.allowedSources ?? [];
}

/** Check if a source is allowed for a vertical */
export function isSourceAllowed(vertical: OnboardingVertical, source: string): boolean {
  const policy = SOURCE_POLICIES[vertical];
  if (!policy) return false;
  return policy.allowedSources.includes(source);
}

/** Check if a source is explicitly forbidden for a vertical */
export function isSourceForbidden(vertical: OnboardingVertical, source: string): boolean {
  const policy = SOURCE_POLICIES[vertical];
  if (!policy) return true;
  return policy.forbiddenSources.includes(source);
}

/** Get primary sources (highest trust) for a vertical */
export function getPrimarySources(vertical: OnboardingVertical): string[] {
  return SOURCE_POLICIES[vertical]?.primarySources ?? [];
}

/** Get fallback sources for a vertical */
export function getFallbackSources(vertical: OnboardingVertical): string[] {
  return SOURCE_POLICIES[vertical]?.fallbackSources ?? [];
}

/** Filter a list of source records, keeping only allowed ones */
export function filterAllowedSources(
  vertical: OnboardingVertical,
  sources: { source: string; [key: string]: any }[]
): typeof sources {
  return sources.filter((s) => isSourceAllowed(vertical, s.source));
}
