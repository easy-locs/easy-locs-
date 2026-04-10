/**
 * Source Policy — Vertical-specific source priority and access control.
 * Decides which sources are authorized, primary, fallback, and forbidden.
 */
import type { Vertical, SourceName } from "../types";

export interface SourcePolicy {
  vertical: Vertical;
  allowedSources: SourceName[];
  primarySources: SourceName[];
  fallbackSources: SourceName[];
  forbiddenSources: SourceName[];
}

export const SOURCE_POLICIES: Record<string, SourcePolicy> = {
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
  stay: {
    vertical: "stay",
    allowedSources: ["booking", "expedia", "govoyage", "airbnb", "official_web", "google_business"],
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
    allowedSources: ["property_portal", "official_web", "crm_import", "bayut", "dubizzle", "google_business"],
    primarySources: ["property_portal", "crm_import"],
    fallbackSources: ["official_web", "google_business"],
    forbiddenSources: ["deliveroo", "talabat", "careem", "booking", "expedia", "govoyage"],
  },
  shops: {
    vertical: "shops",
    allowedSources: ["official_web", "amazon", "namshi", "google_business"],
    primarySources: ["official_web", "google_business"],
    fallbackSources: ["amazon", "namshi"],
    forbiddenSources: ["booking", "expedia", "deliveroo"],
  },
  mobility: {
    vertical: "mobility",
    allowedSources: ["official_web", "uber", "bolt", "google_business"],
    primarySources: ["official_web"],
    fallbackSources: ["google_business"],
    forbiddenSources: ["booking", "expedia", "deliveroo", "talabat"],
  },
  utility: {
    vertical: "utility",
    allowedSources: ["official_web", "google_business"],
    primarySources: ["official_web"],
    fallbackSources: ["google_business"],
    forbiddenSources: [],
  },
  healthcare: {
    vertical: "healthcare",
    allowedSources: ["official_web", "google_business", "trusted_directory"],
    primarySources: ["official_web", "google_business"],
    fallbackSources: ["trusted_directory"],
    forbiddenSources: ["deliveroo", "talabat", "booking"],
  },
  experiences: {
    vertical: "experiences",
    allowedSources: ["official_web", "google_business"],
    primarySources: ["official_web"],
    fallbackSources: ["google_business"],
    forbiddenSources: ["deliveroo", "talabat"],
  },
};

export function getPolicy(vertical: Vertical): SourcePolicy {
  return SOURCE_POLICIES[vertical];
}

export function isSourceAllowed(vertical: Vertical, source: string): boolean {
  return (SOURCE_POLICIES[vertical]?.allowedSources as string[])?.includes(source) ?? false;
}

export function isSourceForbidden(vertical: Vertical, source: string): boolean {
  return (SOURCE_POLICIES[vertical]?.forbiddenSources as string[])?.includes(source) ?? false;
}

export function getPrimarySources(vertical: Vertical): SourceName[] {
  return SOURCE_POLICIES[vertical]?.primarySources ?? [];
}
