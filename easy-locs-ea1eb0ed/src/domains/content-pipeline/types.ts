import type { CanonicalVertical, MediaKind, CardTemplate } from "@/lib/taxonomy/canonical-registry";

export type EntityLifecycleStatus =
  | "raw"
  | "normalized"
  | "classified"
  | "needs_review"
  | "approved"
  | "published"
  | "quarantined"
  | "rejected"
  | "archived";

export type MediaLifecycleStatus =
  | "imported"
  | "analyzed"
  | "candidate"
  | "approved"
  | "primary_locked"
  | "rejected"
  | "quarantined";

export type ReclassificationStatus =
  | "requested"
  | "analyzing"
  | "pending_review"
  | "approved"
  | "rejected"
  | "applied";

export type ImportSourceType =
  | "scraper"
  | "api"
  | "manual"
  | "bulk_import"
  | "partner_feed"
  | "web_crawl"
  | "legacy";

export type ConfidenceBand =
  | "high"
  | "medium"
  | "low"
  | "rejected";

export type ValidationGateId =
  | "schema"
  | "taxonomy"
  | "media"
  | "confidence"
  | "duplicate"
  | "canonical_integrity"
  | "publish";

export type GateResult = "pass" | "fail" | "warn" | "skip";

export type LockType =
  | "taxonomy_lock"
  | "canonical_lock"
  | "media_lock"
  | "publish_lock"
  | "template_lock"
  | "relationship_lock";

export type QuarantineReason =
  | "low_confidence"
  | "taxonomy_conflict"
  | "canonical_conflict"
  | "media_mismatch"
  | "duplicate_conflict"
  | "illegal_field_combination"
  | "cross_vertical_contamination"
  | "missing_required_fields"
  | "gate_failure";

export type JobStatus =
  | "pending"
  | "processing"
  | "succeeded"
  | "failed"
  | "retrying"
  | "quarantined";

export type AuditAction =
  | "import"
  | "normalize"
  | "classify"
  | "validate"
  | "approve"
  | "reject"
  | "publish"
  | "unpublish"
  | "quarantine"
  | "unquarantine"
  | "reclassify"
  | "media_assign"
  | "media_remove"
  | "media_lock"
  | "lock_change"
  | "field_edit";

export interface RawEntity {
  id: string;
  sourceId: string;
  sourceType: ImportSourceType;
  sourceUrl: string | null;
  rawName: string;
  rawAddress: string | null;
  rawPhone: string | null;
  rawEmail: string | null;
  rawWebsite: string | null;
  rawCategory: string | null;
  rawSubcategory: string | null;
  rawDescription: string | null;
  rawLat: number | null;
  rawLng: number | null;
  rawImageUrls: string[];
  rawMetadata: Record<string, unknown>;
  importJobId: string | null;
  status: "pending" | "processing" | "processed" | "failed";
  createdAt: string;
}

export interface NormalizedEntity {
  id: string;
  rawEntityId: string;
  normalizedName: string;
  normalizedAddress: string | null;
  normalizedCity: string | null;
  normalizedCountry: string | null;
  normalizedCountryCode: string | null;
  normalizedPhone: string | null;
  normalizedEmail: string | null;
  normalizedWebsite: string | null;
  normalizedLat: number | null;
  normalizedLng: number | null;
  normalizedDescription: string | null;
  normalizedCategoryHint: string | null;
  normalizedSubcategoryHint: string | null;
  normalizedImageUrls: string[];
  sourceProvenance: {
    sourceType: ImportSourceType;
    sourceId: string;
    sourceUrl: string | null;
    importedAt: string;
  };
  status: EntityLifecycleStatus;
  createdAt: string;
}

export interface CanonicalEntity {
  id: string;
  normalizedEntityId: string;
  vertical: CanonicalVertical;
  category: string;
  subcategory: string;
  canonicalType: string;
  canonicalSubtype: string | null;
  canonicalPath: string;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  mapperVersion: string;
  validationStatus: EntityLifecycleStatus;
  publishStatus: EntityLifecycleStatus;
  reviewRequired: boolean;
  name: string;
  description: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  countryCode: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  lat: number | null;
  lng: number | null;
  metadata: Record<string, unknown>;
  sourceProvenance: {
    sourceType: ImportSourceType;
    sourceId: string;
    sourceUrl: string | null;
    importedAt: string;
    normalizedAt: string;
    classifiedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EntityValidationResult {
  id: string;
  canonicalEntityId: string;
  gateId: ValidationGateId;
  result: GateResult;
  details: string;
  riskFlags: string[];
  checkedAt: string;
}

export interface EntityPublishState {
  id: string;
  canonicalEntityId: string;
  status: EntityLifecycleStatus;
  publishedAt: string | null;
  unpublishedAt: string | null;
  locks: LockType[];
  completenessScore: number;
  lastValidatedAt: string;
  reviewerId: string | null;
  reviewNotes: string | null;
}

export interface MediaAsset {
  id: string;
  entityId: string | null;
  sourceUrl: string;
  sourceType: ImportSourceType;
  sourceProvenance: string | null;
  storedUrl: string | null;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  sizeBytes: number | null;
  format: string | null;
  fingerprint: string | null;
  detectedMediaKind: MediaKind | null;
  entityMatchConfidence: number;
  verticalMatchConfidence: number;
  qualityScore: number;
  verificationStatus: MediaLifecycleStatus;
  moderationStatus: "pending" | "approved" | "rejected" | "flagged";
  lockStatus: "unlocked" | "locked";
  isPrimary: boolean;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MediaAnalysisResult {
  id: string;
  mediaAssetId: string;
  detectedMediaKind: MediaKind | null;
  detectedLabels: string[];
  entityMatchConfidence: number;
  verticalMatchConfidence: number;
  isStock: boolean;
  hasWatermark: boolean;
  isDuplicate: boolean;
  duplicateOfId: string | null;
  qualityScore: number;
  analysisVersion: string;
  analyzedAt: string;
}

export interface QuarantineEntry {
  id: string;
  entityId: string | null;
  mediaAssetId: string | null;
  reason: QuarantineReason;
  details: string;
  failedGates: ValidationGateId[];
  confidenceScore: number | null;
  quarantinedAt: string;
  resolvedAt: string | null;
  resolution: "approved" | "rejected" | "reclassified" | null;
  reviewerId: string | null;
}

export interface ReclassificationRequest {
  id: string;
  entityId: string;
  oldCanonicalPath: string;
  newCanonicalPath: string | null;
  requestedBy: string;
  reason: string;
  status: ReclassificationStatus;
  validationResults: EntityValidationResult[];
  requestedAt: string;
  resolvedAt: string | null;
  resolvedBy: string | null;
}

export interface ReviewQueueItem {
  id: string;
  entityId: string | null;
  mediaAssetId: string | null;
  type: "entity_review" | "media_review" | "reclassification" | "quarantine_review";
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed" | "skipped";
  assignedTo: string | null;
  rawSource: Record<string, unknown> | null;
  normalizedFields: Record<string, unknown> | null;
  canonicalSuggestions: Array<{ path: string; confidence: number }>;
  rejectedMedia: string[];
  approvedMedia: string[];
  notes: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface PipelineJob {
  id: string;
  type: "import" | "normalize" | "classify" | "validate" | "publish" | "media_analyze" | "duplicate_check" | "quarantine" | "reclassify";
  entityId: string | null;
  mediaAssetId: string | null;
  status: JobStatus;
  inputSource: string;
  logicVersion: string;
  result: Record<string, unknown> | null;
  failureReason: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  entityId: string | null;
  mediaAssetId: string | null;
  action: AuditAction;
  actorId: string | null;
  actorType: "system" | "user" | "worker" | "admin";
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  reason: string | null;
  mapperVersion: string | null;
  validatorVersion: string | null;
  timestamp: string;
}

export interface GateCheckOutput {
  gateId: ValidationGateId;
  result: GateResult;
  details: string;
  riskFlags: string[];
  failedChecks: string[];
  passedChecks: string[];
}

export interface PipelineResult {
  entityId: string;
  status: EntityLifecycleStatus;
  canonicalPath: string | null;
  confidenceScore: number;
  confidenceBand: ConfidenceBand;
  gateResults: GateCheckOutput[];
  passedAllGates: boolean;
  quarantined: boolean;
  quarantineReasons: QuarantineReason[];
  publishEligible: boolean;
  reviewRequired: boolean;
  auditTrail: AuditLogEntry[];
}

export interface LegacyAuditResult {
  totalEntities: number;
  passedAutomatically: number;
  reclassified: number;
  quarantined: number;
  wrongMedia: number;
  duplicatesFound: number;
  badRenderingsFixed: number;
  unresolved: number;
  details: Array<{
    entityId: string;
    entityName: string;
    oldPath: string | null;
    newPath: string | null;
    action: "passed" | "reclassified" | "quarantined" | "media_fixed" | "duplicate" | "unresolved";
    confidenceScore: number;
    issues: string[];
  }>;
}
