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

export function isSourceAllowed(vertical: Vertical, source: string): boolean {
  return (SOURCE_POLICIES[vertical]?.allowedSources as string[])?.includes(source) ?? false;
}

export function isSourceForbidden(vertical: Vertical, source: string): boolean {
  return (SOURCE_POLICIES[vertical]?.forbiddenSources as string[])?.includes(source) ?? false;
}

export function getPrimarySources(vertical: Vertical): SourceName[] {
  return SOURCE_POLICIES[vertical]?.primarySources ?? [];
}
