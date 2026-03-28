/**
 * Field Priority — Per-vertical source priority for field-level merge.
 * Determines which source wins each field when merging multiple records.
 */
import type { Vertical, SourceName } from "../types";

export const FIELD_PRIORITY: Record<Vertical, Record<string, SourceName[]>> = {
  food: {
    canonicalName: ["official_web", "deliveroo", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "deliveroo", "talabat", "careem"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    description: ["official_web", "google_business", "deliveroo"],
    openingHours: ["official_web", "google_business", "deliveroo", "talabat", "careem"],
    menuItems: ["deliveroo", "talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "deliveroo", "talabat", "careem"],
    rating: ["google_business", "deliveroo", "talabat"],
  },
  grocery: {
    canonicalName: ["official_web", "talabat", "careem", "noon", "google_business"],
    address: ["google_business", "official_web", "talabat", "careem", "noon"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    description: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "talabat", "careem", "noon"],
    menuItems: ["talabat", "careem", "noon", "official_web"],
    photos: ["official_web", "talabat", "careem", "noon"],
    rating: ["google_business", "talabat"],
  },
  hotel: {
    canonicalName: ["official_web", "booking", "expedia", "govoyage", "google_business"],
    address: ["booking", "expedia", "official_web", "google_business"],
    phone: ["official_web", "google_business"],
    website: ["official_web", "google_business"],
    description: ["official_web", "booking", "expedia"],
    openingHours: ["official_web"],
    hotelInventory: ["booking", "expedia", "govoyage", "official_web"],
    photos: ["official_web", "booking", "expedia", "govoyage"],
    rating: ["google_business", "booking", "expedia"],
  },
  services: {
    canonicalName: ["official_web", "google_business", "trusted_directory"],
    address: ["google_business", "official_web", "trusted_directory"],
    phone: ["official_web", "google_business", "trusted_directory"],
    website: ["official_web", "google_business"],
    description: ["official_web", "google_business"],
    openingHours: ["official_web", "google_business", "trusted_directory"],
    serviceItems: ["official_web", "trusted_directory"],
    photos: ["official_web", "google_business", "trusted_directory"],
    rating: ["google_business", "trusted_directory"],
  },
  property: {
    canonicalName: ["crm_import", "property_portal", "official_web"],
    address: ["crm_import", "property_portal", "official_web", "google_business"],
    phone: ["crm_import", "official_web", "google_business"],
    website: ["official_web"],
    description: ["crm_import", "property_portal", "official_web"],
    photos: ["crm_import", "property_portal", "official_web"],
    rating: ["google_business"],
  },
};

export function getFieldPriority(vertical: Vertical, field: string): SourceName[] {
  return FIELD_PRIORITY[vertical]?.[field] ?? [];
}
