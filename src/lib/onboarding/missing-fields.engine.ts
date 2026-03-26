/**
 * Missing Fields Detector — Identifies what data is still needed
 * before an entity can pass the publish gate, per vertical.
 */
import type { OnboardingVertical } from "./source-policy.engine";

export interface CanonicalMerchantRecord {
  entity_id: string;
  vertical: OnboardingVertical;
  canonical_name?: string | null;
  address?: string | null;
  city?: string | null;
  district?: string | null;
  country?: string | null;
  lat?: number | null;
  lng?: number | null;
  phone?: string | null;
  website?: string | null;
  categories?: string[];
  subcategories?: string[];
  menu_items_json?: any[];
  hotel_inventory_json?: any[];
  services_json?: any[];
  opening_hours_json?: any;
  photos_json?: any[];
  logo_url?: string | null;
  description?: string | null;
  amenities?: string[];
  policies_json?: any;
  rating?: number | null;
}

/** Required fields per vertical for minimum publish readiness */
const REQUIRED_FIELDS: Record<OnboardingVertical, string[]> = {
  food: ["canonical_name", "address", "lat", "lng", "categories", "phone"],
  grocery: ["canonical_name", "address", "lat", "lng", "categories"],
  hotel: ["canonical_name", "address", "lat", "lng", "photos_json", "amenities"],
  services: ["canonical_name", "address", "lat", "lng", "categories", "phone"],
  property: ["canonical_name", "address", "lat", "lng", "photos_json"],
};

/** Strongly recommended fields (not blocking but lower quality score) */
const RECOMMENDED_FIELDS: Record<OnboardingVertical, string[]> = {
  food: ["logo_url", "opening_hours_json", "photos_json", "menu_items_json", "description"],
  grocery: ["logo_url", "opening_hours_json", "photos_json", "description"],
  hotel: ["phone", "description", "policies_json", "rating", "logo_url"],
  services: ["logo_url", "opening_hours_json", "photos_json", "description"],
  property: ["description", "amenities", "phone"],
};

function isFieldPresent(record: Record<string, any>, field: string): boolean {
  const val = record[field];
  if (val == null || val === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

export interface MissingFieldsResult {
  missingRequired: string[];
  missingRecommended: string[];
  completenessScore: number; // 0-100
  isPublishReady: boolean;
}

export function detectMissingFields(record: CanonicalMerchantRecord): MissingFieldsResult {
  const vertical = record.vertical;
  const required = REQUIRED_FIELDS[vertical] ?? [];
  const recommended = RECOMMENDED_FIELDS[vertical] ?? [];

  const missingRequired = required.filter((f) => !isFieldPresent(record as any, f));
  const missingRecommended = recommended.filter((f) => !isFieldPresent(record as any, f));

  const totalFields = required.length + recommended.length;
  const presentRequired = required.length - missingRequired.length;
  const presentRecommended = recommended.length - missingRecommended.length;

  // Required fields count double
  const completenessScore =
    totalFields === 0
      ? 100
      : Math.round(((presentRequired * 2 + presentRecommended) / (required.length * 2 + recommended.length)) * 100);

  return {
    missingRequired,
    missingRecommended,
    completenessScore,
    isPublishReady: missingRequired.length === 0,
  };
}
