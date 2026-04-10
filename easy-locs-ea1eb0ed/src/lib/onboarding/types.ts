/**
 * Canonical Onboarding Types — Single source of truth for the multi-source pipeline.
 */

export type Vertical =
  | "food"
  | "grocery"
  | "hotel"
  | "services"
  | "property";

export type SourceName =
  | "deliveroo"
  | "talabat"
  | "careem"
  | "noon"
  | "booking"
  | "expedia"
  | "govoyage"
  | "official_web"
  | "google_business"
  | "trusted_directory"
  | "property_portal"
  | "crm_import";

export interface SourcePolicy {
  vertical: Vertical;
  allowedSources: SourceName[];
  primarySources: SourceName[];
  fallbackSources: SourceName[];
  forbiddenSources: SourceName[];
}

export interface SourceEvidence {
  source: SourceName;
  field: string;
  value: unknown;
  confidence: number;
  fetchedAt: string;
  url?: string | null;
}

export interface SourceEntityRecord {
  source: SourceName;
  sourceEntityId: string;
  vertical: Vertical;

  name?: string | null;
  branchName?: string | null;

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

  openingHours?: Record<string, unknown> | null;
  menuItems?: Array<Record<string, unknown>>;
  hotelInventory?: Array<Record<string, unknown>>;
  serviceItems?: Array<Record<string, unknown>>;
  photos?: string[];

  rating?: number | null;
  reviewCount?: number | null;

  metadata?: Record<string, unknown>;
  sourceUrl?: string | null;
}

export interface CanonicalOnboardingRecord {
  entityId: string;
  vertical: Vertical;

  canonicalName: string | null;
  branchName: string | null;

  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;

  phone: string | null;
  website: string | null;

  categories: string[];
  subcategories: string[];

  openingHours: Record<string, unknown> | null;
  menuItems: Array<Record<string, unknown>>;
  hotelInventory: Array<Record<string, unknown>>;
  serviceItems: Array<Record<string, unknown>>;
  photos: string[];

  rating: number | null;
  reviewCount: number | null;

  sourceProofs: SourceEvidence[];
  mergeConfidence: number;
  missingFields: string[];
  needsReview: boolean;
}

export interface OnboardingQualityResult {
  score: number;
  missingFields: string[];
  warnings: string[];
  readyToPublish: boolean;
}

export interface PublishGateResult {
  allowed: boolean;
  reasons: string[];
  targetVisibility: "draft" | "public";
}
