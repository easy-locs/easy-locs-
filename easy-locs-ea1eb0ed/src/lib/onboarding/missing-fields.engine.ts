/**
 * Missing Fields Detector — Identifies what data is still needed
 * before an entity can pass the publish gate, per vertical.
 */
import type { OnboardingVertical } from "./source-policy.engine";

export interface MenuItem {
  name: string;
  price: number;
  category?: string;
  description?: string;
}

export interface HotelInventoryItem {
  roomType: string;
  capacity: number;
  pricePerNight: number;
  available: boolean;
}

export interface ServiceItem {
  name: string;
  price: number;
  duration?: number;
  category?: string;
}

export interface PhotoItem {
  url: string;
  alt?: string;
  category?: string;
}

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
  menu_items_json?: MenuItem[];
  hotel_inventory_json?: HotelInventoryItem[];
  services_json?: ServiceItem[];
  opening_hours_json?: Record<string, { open: string; close: string }>;
  photos_json?: PhotoItem[];
  logo_url?: string | null;
  description?: string | null;
  amenities?: string[];
  policies_json?: Record<string, string>;
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

function isFieldPresent(record: Record<string, unknown>, field: string): boolean {
  const val = record[field];
  if (val == null || val === "") return false;
  if (Array.isArray(val) && val.length === 0) return false;
  return true;
}

export interface MissingFieldsResult {
  missingRequired: string[];
  missingRecommended: string[];
  completenessScore: number;
  isPublishReady: boolean;
}

export function detectMissingFields(record: CanonicalMerchantRecord): MissingFieldsResult {
  const vertical = record.vertical;
  const required = REQUIRED_FIELDS[vertical] ?? [];
  const recommended = RECOMMENDED_FIELDS[vertical] ?? [];

  const missingRequired = required.filter((f) => !isFieldPresent(record as unknown as Record<string, unknown>, f));
  const missingRecommended = recommended.filter((f) => !isFieldPresent(record as unknown as Record<string, unknown>, f));

  const totalFields = required.length + recommended.length;
  const presentRequired = required.length - missingRequired.length;
  const presentRecommended = recommended.length - missingRecommended.length;

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
