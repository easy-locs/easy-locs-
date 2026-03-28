/**
 * Import Engine — Canonical Types
 * ================================
 * Single source of truth for the entire import domain.
 * Every module in this engine imports from HERE, never from outside.
 */

// ─── Verticals ───
export type Vertical = "food" | "grocery" | "hotel" | "services" | "property";

// ─── Source Names ───
export type SourceName =
  | "deliveroo" | "talabat" | "careem" | "noon"
  | "booking" | "expedia" | "govoyage"
  | "official_web" | "google_business"
  | "trusted_directory" | "property_portal" | "crm_import";

// ─── Taxonomy Hierarchy ───
export interface TaxonomyNode {
  family: string;
  category: string;
  subcategory: string;
  subSubcategory?: string;
  tags: string[];
  confidence: number; // 0-100
}

// ─── Entity Lifecycle ───
export type EntityStatus = "draft" | "ready" | "published" | "rejected" | "archived";

// ─── Source Evidence (field-level provenance) ───
export interface SourceEvidence {
  source: SourceName;
  field: string;
  value: unknown;
  confidence: number; // 0-1
  fetchedAt: string;
  url?: string | null;
}

// ─── Raw Source Record (input to engine) ───
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

  description?: string | null;
  metadata?: Record<string, unknown>;
  sourceUrl?: string | null;
}

// ─── Canonical Entity (output of engine) ───
export interface CanonicalEntity {
  entityId: string;
  vertical: Vertical;
  status: EntityStatus;

  // Identity
  canonicalName: string | null;
  branchName: string | null;
  slug: string | null;
  description: string | null;

  // Taxonomy
  taxonomy: TaxonomyNode;

  // Location
  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  lat: number | null;
  lng: number | null;

  // Contact
  phone: string | null;
  website: string | null;

  // Catalog
  menuItems: Array<Record<string, unknown>>;
  hotelInventory: Array<Record<string, unknown>>;
  serviceItems: Array<Record<string, unknown>>;

  // Media
  photos: string[];
  logoUrl: string | null;

  // Reputation
  rating: number | null;
  reviewCount: number | null;

  // Hours
  openingHours: Record<string, unknown> | null;

  // SEO
  seoTitle: string | null;
  seoDescription: string | null;

  // Provenance
  sourceProofs: SourceEvidence[];
  mergeConfidence: number; // 0-1
  missingFields: string[];
  needsReview: boolean;

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

// ─── Quality Report (5-dimension) ───
export interface QualityReport {
  score: number;           // 0-100
  completeness: number;    // 0-100
  media: number;           // 0-100
  location: number;        // 0-100
  catalog: number;         // 0-100
  trust: number;           // 0-100
  details: string[];
  readyToPublish: boolean;
}

// ─── Publish Gate Decision ───
export interface PublishDecision {
  allowed: boolean;
  targetStatus: EntityStatus;
  reasons: string[];
  qualityScore: number;
}

// ─── Dedup Match ───
export interface DedupMatch {
  entityA: string;
  entityB: string;
  confidence: number; // 0-1
  matchedOn: string[];
}

// ─── Pipeline Input ───
export interface ImportInput {
  vertical: Vertical;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}

// ─── Pipeline Result ───
export interface ImportResult {
  entities: CanonicalEntity[];
  qualityReports: Map<string, QualityReport>;
  publishDecisions: Map<string, PublishDecision>;
  duplicatesFound: number;
  sourcesQueried: string[];
  errors: Array<{ source: string; error: string }>;
  totalDurationMs: number;
  trace: PipelineTrace;
}

// ─── Pipeline Trace (observability) ───
export interface PipelineTrace {
  pipelineId: string;
  input: ImportInput;
  steps: PipelineStep[];
  totalDurationMs: number;
  completedAt: string;
}

export interface PipelineStep {
  name: string;
  durationMs: number;
  success: boolean;
  inputCount?: number;
  outputCount?: number;
  error?: string;
}
