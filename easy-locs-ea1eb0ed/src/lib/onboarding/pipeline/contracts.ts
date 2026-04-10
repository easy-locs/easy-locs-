/**
 * MASTER TYPE CONTRACTS — Single source of truth for every pipeline layer.
 * Every atomic unit's input/output is defined here.
 * NO unit may define its own ad-hoc types.
 */
import type { Vertical, SourceName, SourceEntityRecord, CanonicalOnboardingRecord, SourceEvidence } from "../types";

// ═══════════════════════════════════════════════════════════════
// PIPELINE EXECUTION
// ═══════════════════════════════════════════════════════════════

export type StepStatus = "pending" | "running" | "success" | "skipped" | "failed";

export interface StepState {
  name: string;
  status: StepStatus;
  startedAt: string | null;
  completedAt: string | null;
  durationMs: number;
  inputSummary: string;
  outputSummary: string;
  error: string | null;
  retryCount: number;
}

export interface PipelineRunState {
  runId: string;
  input: RawInput;
  steps: StepState[];
  status: "running" | "completed" | "partial" | "failed";
  startedAt: string;
  completedAt: string | null;
  totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════
// INPUT LAYER
// ═══════════════════════════════════════════════════════════════

export interface RawInput {
  raw: string;
  vertical?: Vertical;
  city?: string;
  district?: string;
  country?: string;
  phone?: string;
  language?: string;
  timezone?: string;
  currency?: string;
}

export interface UrlValidationResult {
  isUrl: boolean;
  isValid: boolean;
  error: string | null;
}

export interface NormalizedUrl {
  original: string;
  normalized: string;
  protocol: string;
  hostname: string;
  pathname: string;
  search: string;
}

export type QueryIntent = "url_import" | "name_search" | "phone_lookup" | "ambiguous";

export interface QueryClassification {
  intent: QueryIntent;
  confidence: number;
  detectedVertical: Vertical | null;
  detectedCity: string | null;
  detectedCountry: string | null;
  languageHint: string | null;
}

export interface DomainExtraction {
  domain: string;
  tld: string;
  brandName: string;
  isAggregator: boolean;
  aggregatorName: SourceName | null;
  countryHint: string | null;
}

export interface InputLayerOutput {
  raw: RawInput;
  url: NormalizedUrl | null;
  classification: QueryClassification;
  domain: DomainExtraction | null;
  vertical: Vertical;
  geoHints: { city?: string; country?: string; district?: string; timezone?: string; currency?: string };
}

// ═══════════════════════════════════════════════════════════════
// FETCH LAYER
// ═══════════════════════════════════════════════════════════════

export interface FetchRequest {
  source: SourceName;
  vertical: Vertical;
  params: Record<string, string | undefined>;
}

export interface FetchResult {
  source: SourceName;
  records: SourceEntityRecord[];
  durationMs: number;
  error: string | null;
  httpStatus: number | null;
}

export interface FetchLayerOutput {
  primaryResults: FetchResult[];
  fallbackResults: FetchResult[];
  allRecords: SourceEntityRecord[];
  sourcesQueried: string[];
  sourcesSucceeded: string[];
  sourcesFailed: Array<{ source: string; error: string }>;
  totalDurationMs: number;
}

// ═══════════════════════════════════════════════════════════════
// EXTRACTION LAYER (vertical-specific field extraction)
// ═══════════════════════════════════════════════════════════════

export interface ExtractedMetadata {
  title: string | null;
  description: string | null;
  ogImage: string | null;
  language: string | null;
  favicon: string | null;
}

export interface ExtractedAddress {
  raw: string | null;
  street: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  postalCode: string | null;
}

export interface ExtractedContact {
  phone: string | null;
  email: string | null;
  website: string | null;
  socialLinks: Array<{ platform: string; url: string }>;
}

export interface ExtractedHours {
  raw: Record<string, unknown> | null;
  isOpen24h: boolean;
  timezone: string | null;
}

export interface ExtractedMenuItem {
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  imageUrl: string | null;
  modifiers: string[];
  isAvailable: boolean;
}

export interface ExtractedHotelRoom {
  roomType: string;
  description: string | null;
  maxOccupancy: number | null;
  basePrice: number | null;
  currency: string | null;
  amenities: string[];
  imageUrl: string | null;
}

export interface ExtractedService {
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  duration: string | null;
  category: string | null;
}

export interface ExtractedProduct {
  name: string;
  description: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  variants: string[];
  imageUrl: string | null;
  inStock: boolean | null;
}

export interface ExtractionLayerOutput {
  metadata: ExtractedMetadata;
  address: ExtractedAddress;
  contact: ExtractedContact;
  hours: ExtractedHours;
  images: string[];
  menuItems: ExtractedMenuItem[];
  hotelRooms: ExtractedHotelRoom[];
  services: ExtractedService[];
  products: ExtractedProduct[];
  categories: string[];
  subcategories: string[];
  cuisineHints: string[];
  deliveryHints: { hasDelivery: boolean; hasTakeaway: boolean; hasDineIn: boolean };
}

// ═══════════════════════════════════════════════════════════════
// MEDIA LAYER
// ═══════════════════════════════════════════════════════════════

export interface NormalizedImage {
  url: string;
  originalUrl: string;
  width: number | null;
  height: number | null;
  format: string | null;
}

export interface ImageQualityScore {
  url: string;
  score: number; // 0-100
  isStock: boolean;
  isLogo: boolean;
  isCover: boolean;
  reason: string;
}

export interface MediaLayerOutput {
  normalized: NormalizedImage[];
  deduplicated: NormalizedImage[];
  scored: ImageQualityScore[];
  selectedCover: string | null;
  selectedLogo: string | null;
  gallery: string[];
}

// ═══════════════════════════════════════════════════════════════
// GEO LAYER
// ═══════════════════════════════════════════════════════════════

export interface GeoNormalizedAddress {
  input: string;
  normalized: string;
  confidence: number;
}

export interface GeoResolution {
  country: string | null;
  countryCode: string | null;
  city: string | null;
  district: string | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  timezone: string | null;
  currency: string | null;
  language: string | null;
  confidence: number;
}

export interface GeoLayerOutput {
  address: GeoNormalizedAddress | null;
  resolution: GeoResolution;
}

// ═══════════════════════════════════════════════════════════════
// TAXONOMY LAYER
// ═══════════════════════════════════════════════════════════════

export interface TaxonomyInference {
  vertical: Vertical;
  confidence: number;
  signals: string[];
}

export interface TaxonomyCategoryMapping {
  vertical: string;
  category: string | null;
  subcategory: string | null;
  tags: string[];
  confidence: number;
}

export interface TaxonomyLayerOutput {
  inference: TaxonomyInference;
  mapping: TaxonomyCategoryMapping;
}

// ═══════════════════════════════════════════════════════════════
// ENTITY LAYER
// ═══════════════════════════════════════════════════════════════

export interface EntityCandidate {
  groupId: string;
  records: SourceEntityRecord[];
  matchSignals: string[];
}

export interface EntityIdentity {
  entityId: string;
  canonicalName: string | null;
  branchName: string | null;
  vertical: Vertical;
}

export interface EntityProfile {
  identity: EntityIdentity;
  location: GeoResolution;
  contact: ExtractedContact;
  media: MediaLayerOutput;
  taxonomy: TaxonomyCategoryMapping;
  hours: ExtractedHours;
  rating: number | null;
  reviewCount: number | null;
}

export interface EntityCatalog {
  menuItems: ExtractedMenuItem[];
  hotelRooms: ExtractedHotelRoom[];
  services: ExtractedService[];
  products: ExtractedProduct[];
}

export interface EntityLayerOutput {
  candidates: EntityCandidate[];
  profiles: EntityProfile[];
  catalogs: EntityCatalog[];
  sourceProofs: SourceEvidence[];
  mergeConfidence: number;
  missingFields: string[];
  needsReview: boolean;
}

// ═══════════════════════════════════════════════════════════════
// QUALITY LAYER
// ═══════════════════════════════════════════════════════════════

export interface QualityDimension {
  dimension: string;
  score: number; // 0-100
  weight: number; // 0-1
  details: string;
}

export interface QualityReport {
  completeness: QualityDimension;
  media: QualityDimension;
  location: QualityDimension;
  catalog: QualityDimension;
  trust: QualityDimension;
  globalScore: number;
  missingFields: string[];
  warnings: string[];
  readyToPublish: boolean;
}

// ═══════════════════════════════════════════════════════════════
// GOVERNANCE LAYER
// ═══════════════════════════════════════════════════════════════

export interface PolicyCheckResult {
  vertical: Vertical;
  country: string | null;
  city: string | null;
  sourcePolicyMet: boolean;
  geoGateMet: boolean;
  qualityGateMet: boolean;
  violations: string[];
}

export interface PublishGateDecision {
  entityId: string;
  allowed: boolean;
  targetVisibility: "draft" | "public";
  reasons: string[];
  qualityScore: number;
  qualityReport: QualityReport;
}

export interface GovernanceLayerOutput {
  policyCheck: PolicyCheckResult;
  publishDecision: PublishGateDecision;
  visibilityMode: "live" | "coming_soon" | "hidden" | "search_only";
  reasonLog: string[];
}

// ═══════════════════════════════════════════════════════════════
// PERSISTENCE LAYER
// ═══════════════════════════════════════════════════════════════

export interface ImportRunRecord {
  runId: string;
  vertical: Vertical;
  inputJson: RawInput;
  status: string;
  resultJson: unknown;
  createdAt: string;
}

export interface StorefrontPayload {
  canonical_name: string;
  vertical: string;
  category: string | null;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  district: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  opening_hours_json: Record<string, unknown> | null;
  logo_url: string | null;
  cover_image_url: string | null;
  gallery_urls: string[];
  menu_items_json: Record<string, unknown>[];
  hotel_inventory_json: Record<string, unknown>[];
  service_items_json: Record<string, unknown>[];
  source_proofs_json: Record<string, unknown>[];
  merge_confidence: number;
  missing_fields: string[];
  needs_review: boolean;
  publish_visibility: "draft" | "public";
  currency: string | null;
  timezone: string | null;
  language: string | null;
}

export interface PersistenceResult {
  importRunId: string;
  canonicalRecordIds: string[];
  storefrontId: string | null;
  storefrontSlug: string | null;
  searchIndexEnqueued: boolean;
  mapIndexEnqueued: boolean;
}

// ═══════════════════════════════════════════════════════════════
// OUTPUT LAYER
// ═══════════════════════════════════════════════════════════════

export interface AuditTrace {
  runId: string;
  pipelineId: string;
  input: RawInput;
  steps: StepState[];
  entityProfiles: EntityProfile[];
  qualityReports: QualityReport[];
  governanceDecisions: GovernanceLayerOutput[];
  persistenceResults: PersistenceResult | null;
  totalDurationMs: number;
  completedAt: string;
}

export interface PipelinePreview {
  entities: Array<{
    name: string | null;
    vertical: Vertical;
    address: string | null;
    city: string | null;
    country: string | null;
    qualityScore: number;
    publishAllowed: boolean;
    visibility: string;
    menuCount: number;
    roomCount: number;
    serviceCount: number;
    productCount: number;
    photoCount: number;
    missingFields: string[];
    warnings: string[];
  }>;
  trace: AuditTrace;
}

export interface PipelineResult {
  runId: string;
  canonical: CanonicalOnboardingRecord[];
  publishDecisions: PublishGateDecision[];
  qualityReports: QualityReport[];
  governanceOutputs: GovernanceLayerOutput[];
  persistence: PersistenceResult | null;
  preview: PipelinePreview;
  trace: AuditTrace;
}
