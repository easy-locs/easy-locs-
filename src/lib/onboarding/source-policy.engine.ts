/**
 * Source Policy Engine — Decides which data sources are authorized per vertical.
 * Each vertical has its own allowed, primary, fallback, and forbidden source lists.
 */
import type { SourcePolicy, Vertical, SourceName } from "./types";

// Re-export for backward compat
export type OnboardingVertical = Vertical;

export const SOURCE_POLICIES: Record<Vertical, SourcePolicy> = {
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
    forbiddenSources: ["deliveroo", "talabat", "careem", "noon"],
  },
  services: {
    vertical: "services",
    allowedSources: ["official_web", "google_business", "trusted_directory"],
    primarySources: ["official_web", "google_business"],
    fallbackSources: ["trusted_directory"],
    forbiddenSources: ["deliveroo", "talabat", "careem", "booking", "expedia"],
  },
  property: {
    vertical: "property",
    allowedSources: ["property_portal", "official_web", "crm_import", "google_business"],
    primarySources: ["property_portal", "crm_import"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["deliveroo", "talabat", "careem", "booking", "expedia", "govoyage"],
  },
};

export function getPolicy(vertical: Vertical): SourcePolicy {
  return SOURCE_POLICIES[vertical];
}

export function getSourcesForVertical(vertical: Vertical): SourceName[] {
  return SOURCE_POLICIES[vertical]?.allowedSources ?? [];
}

export function isSourceAllowed(vertical: Vertical, source: string): boolean {
  const policy = SOURCE_POLICIES[vertical];
  if (!policy) return false;
  return (policy.allowedSources as string[]).includes(source);
}

export function isSourceForbidden(vertical: Vertical, source: string): boolean {
  const policy = SOURCE_POLICIES[vertical];
  if (!policy) return true;
  return (policy.forbiddenSources as string[]).includes(source);
}

export function getPrimarySources(vertical: Vertical): SourceName[] {
  return SOURCE_POLICIES[vertical]?.primarySources ?? [];
}

export function getFallbackSources(vertical: Vertical): SourceName[] {
  return SOURCE_POLICIES[vertical]?.fallbackSources ?? [];
}

export function filterAllowedSources(
  vertical: Vertical,
  sources: { source: string; [key: string]: any }[]
): typeof sources {
  return sources.filter((s) => isSourceAllowed(vertical, s.source));
}
