/**
 * Field-Level Merge Engine — Merges data from multiple sources field-by-field,
 * using per-vertical source priority rankings.
 * Never "one source wins all": each field is resolved independently.
 */
import type { OnboardingVertical } from "./source-policy.engine";

/** Per-vertical, per-field source priority (first = highest trust) */
export const FIELD_SOURCE_PRIORITY: Record<OnboardingVertical, Record<string, string[]>> = {
  food: {
    name: ["official_web", "deliveroo", "talabat", "careem", "noon", "google_business"],
    menu_items: ["deliveroo", "talabat", "careem", "noon", "official_web"],
    opening_hours: ["official_web", "deliveroo", "talabat", "careem", "google_business"],
    phone: ["official_web", "google_business", "deliveroo", "talabat"],
    coordinates: ["google_business", "deliveroo", "talabat", "careem", "official_web"],
    hero_image: ["official_web", "deliveroo", "talabat", "careem"],
    logo: ["official_web", "google_business", "deliveroo", "talabat"],
    address: ["google_business", "official_web", "deliveroo", "talabat"],
    categories: ["taxonomy_engine", "deliveroo", "talabat", "careem"],
    rating: ["google_business", "deliveroo", "talabat"],
    description: ["official_web", "deliveroo", "talabat", "google_business"],
    delivery_radius: ["deliveroo", "talabat", "careem"],
  },
  grocery: {
    name: ["official_web", "talabat", "careem", "noon", "google_business"],
    catalog_items: ["talabat", "careem", "noon", "official_web"],
    opening_hours: ["official_web", "talabat", "careem", "google_business"],
    phone: ["official_web", "google_business", "talabat"],
    coordinates: ["google_business", "talabat", "careem", "official_web"],
    hero_image: ["official_web", "talabat", "careem"],
    logo: ["official_web", "google_business"],
    address: ["google_business", "official_web", "talabat"],
    categories: ["taxonomy_engine", "talabat", "noon"],
    description: ["official_web", "talabat", "google_business"],
  },
  hotel: {
    name: ["official_web", "booking", "expedia", "govoyage", "google_business"],
    amenities: ["booking", "expedia", "official_web"],
    checkin_checkout: ["official_web", "booking", "expedia"],
    photos: ["official_web", "booking", "expedia", "govoyage"],
    address: ["booking", "expedia", "official_web", "google_business"],
    coordinates: ["google_business", "booking", "expedia", "official_web"],
    phone: ["official_web", "google_business", "booking"],
    room_types: ["booking", "expedia", "official_web"],
    policies: ["official_web", "booking", "expedia"],
    rating: ["google_business", "booking", "expedia"],
    description: ["official_web", "booking", "expedia"],
    logo: ["official_web", "google_business"],
  },
  services: {
    name: ["official_web", "google_business", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    coordinates: ["google_business", "official_web"],
    opening_hours: ["official_web", "google_business"],
    photos: ["official_web", "google_business"],
    categories: ["taxonomy_engine", "google_business", "official_web"],
    description: ["official_web", "google_business"],
    address: ["google_business", "official_web"],
    logo: ["official_web", "google_business"],
    rating: ["google_business"],
    service_catalog: ["official_web", "trusted_directory"],
  },
  property: {
    name: ["crm_import", "property_portal", "official_web"],
    address: ["property_portal", "crm_import", "official_web", "google_business"],
    coordinates: ["google_business", "property_portal", "official_web"],
    photos: ["property_portal", "official_web"],
    phone: ["crm_import", "official_web", "google_business"],
    description: ["official_web", "property_portal"],
    amenities: ["property_portal", "official_web"],
    pricing: ["property_portal", "crm_import"],
    logo: ["official_web"],
    categories: ["taxonomy_engine", "property_portal"],
  },
};

export interface SourceFieldData {
  source: string;
  field: string;
  value: any;
  confidence?: number; // optional per-source confidence
}

export interface MergedField {
  field: string;
  value: any;
  winningSource: string;
  alternativeSources: string[];
}

/**
 * Merge a single field from multiple source contributions.
 * Picks the value from the highest-priority source that has a non-empty value.
 */
export function mergeField(
  vertical: OnboardingVertical,
  field: string,
  contributions: SourceFieldData[]
): MergedField | null {
  const priority = FIELD_SOURCE_PRIORITY[vertical]?.[field] ?? [];

  // Sort contributions by priority index (lower = better)
  const sorted = [...contributions]
    .filter((c) => c.value != null && c.value !== "" && c.value !== undefined)
    .sort((a, b) => {
      const ai = priority.indexOf(a.source);
      const bi = priority.indexOf(b.source);
      const pa = ai === -1 ? 999 : ai;
      const pb = bi === -1 ? 999 : bi;
      return pa - pb;
    });

  if (sorted.length === 0) return null;

  return {
    field,
    value: sorted[0].value,
    winningSource: sorted[0].source,
    alternativeSources: sorted.slice(1).map((s) => s.source),
  };
}

/**
 * Merge all fields from multiple sources into a canonical record.
 */
export function mergeAllFields(
  vertical: OnboardingVertical,
  allContributions: SourceFieldData[]
): MergedField[] {
  const byField = new Map<string, SourceFieldData[]>();
  for (const c of allContributions) {
    if (!byField.has(c.field)) byField.set(c.field, []);
    byField.get(c.field)!.push(c);
  }

  const results: MergedField[] = [];
  for (const [field, contributions] of byField) {
    const merged = mergeField(vertical, field, contributions);
    if (merged) results.push(merged);
  }

  return results;
}
