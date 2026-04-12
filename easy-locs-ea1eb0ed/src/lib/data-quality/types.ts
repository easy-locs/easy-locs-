export type EntityClassification =
  | "VALID"
  | "VALID_WITH_WARNINGS"
  | "SUSPICIOUS"
  | "INVALID"
  | "DUPLICATE"
  | "ORPHAN"
  | "INCOMPLETE"
  | "MISCLASSIFIED"
  | "CROSS_VERTICAL_CONTAMINATION"
  | "BROKEN_MEDIA"
  | "BROKEN_REFERENCE"
  | "LEGACY_SHADOW"
  | "QUARANTINED";

export type IssueSeverity = "critical" | "high" | "medium" | "low" | "info";

export type IssueCategory =
  | "vertical_integrity"
  | "taxonomy_integrity"
  | "media_integrity"
  | "route_integrity"
  | "field_completeness"
  | "reference_integrity"
  | "uniqueness"
  | "source_quality"
  | "cross_vertical";

export type ReasonCode =
  | "WRONG_VERTICAL"
  | "INVALID_CATEGORY"
  | "INVALID_SUBCATEGORY"
  | "WRONG_ENTITY_TYPE"
  | "ROUTE_MISMATCH"
  | "BROKEN_REFERENCE"
  | "BROKEN_MEDIA"
  | "WRONG_MEDIA_SUBJECT"
  | "PLACEHOLDER_MEDIA"
  | "DUPLICATE_EXACT"
  | "DUPLICATE_SEMANTIC"
  | "ORPHAN_ENTITY"
  | "LEGACY_SHADOW"
  | "MOCK_LEAKAGE"
  | "MISSING_REQUIRED_FIELDS"
  | "LOW_CONFIDENCE"
  | "CROSS_VERTICAL_CONTAMINATION"
  | "INVALID_COORDINATES"
  | "CATEGORY_VERTICAL_MISMATCH"
  | "ENTITY_TYPE_MISMATCH"
  | "MISSING_MEDIA"
  | "INVALID_MEDIA_URL"
  | "INVALID_RATING"
  | "NEAR_DUPLICATE_TITLE"
  | "DUPLICATE_ID"
  | "DUPLICATE_SLUG"
  | "NO_MENU_ITEMS"
  | "NO_SERVICE_ITEMS"
  | "BROKEN_ROOM_REFERENCE"
  | "BROKEN_MENU_REFERENCE"
  | "ORPHAN_SERVICE_ITEM"
  | "MISSING_ROOM_MEDIA";

export type DecisionTier =
  | "SAFE_AUTOFIX"
  | "SUPPRESS_FROM_SURFACE"
  | "QUARANTINE"
  | "REVIEW_NEEDED"
  | "IGNORE_WITH_REASON";

export type ExecutionMode =
  | "DRY_RUN"
  | "SAFE_AUTO"
  | "QUARANTINE_PROTECT"
  | "FULL_SWEEP"
  | "INCREMENTAL";

export type SweepCadence = "boot" | "realtime" | "incremental" | "scheduled" | "manual";

export type SurfaceVisibility =
  | "visible"
  | "suppressed"
  | "quarantined"
  | "downgraded"
  | "excluded";

export interface EntityIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  code: string;
  message: string;
  field?: string;
  expected?: string;
  actual?: string;
  reasonCode?: ReasonCode;
  decisionTier?: DecisionTier;
}

export interface EntityQualityRecord {
  entityId: string;
  entityType: string;
  source: string;
  vertical: string;
  canonicalCategory: string;
  canonicalSubcategory: string;
  route?: string;
  mediaSummary: string;
  qualityScore: number;
  trustLevel: TrustLevel;
  classification: EntityClassification;
  issueCodes: ReasonCode[];
  remediationState: RemediationState;
  quarantineState: QuarantineState;
  reviewRequired: boolean;
  lastCheckedAt: string;
  lastRemediatedAt?: string;
  engineFindings: EngineFindings[];
  surfaceVisibilityState: SurfaceVisibility;
}

export type TrustLevel = "canonical" | "high" | "medium" | "low" | "untrusted" | "quarantined";

export type RemediationState =
  | "none"
  | "auto_fixed"
  | "suppressed"
  | "quarantined"
  | "review_pending"
  | "acknowledged"
  | "restored";

export type QuarantineState = "none" | "quarantined" | "review_pending" | "restored";

export interface EngineFindings {
  engineName: string;
  findings: EntityIssue[];
  decisionTier: DecisionTier;
  timestamp: string;
}

export interface EntityFinding {
  entityId: string;
  source: string;
  vertical: string;
  category: string;
  subcategory: string;
  entityType: string;
  title: string;
  route?: string;
  mediaSummary: string;
  classification: EntityClassification;
  issues: EntityIssue[];
  remediationSuggestion?: string;
  qualityScore?: number;
  trustLevel?: TrustLevel;
  surfaceVisibility?: SurfaceVisibility;
  decisionTier?: DecisionTier;
}

export type SourceType =
  | "fallback_static"
  | "db_table"
  | "search_index"
  | "seed_file"
  | "mock"
  | "legacy"
  | "runtime_generated"
  | "canonical"
  | "migrated"
  | "generated";

export type SourceStatus =
  | "live"
  | "fallback"
  | "mock"
  | "seeded"
  | "legacy"
  | "duplicated"
  | "orphan"
  | "mixed";

export type SourceRisk = "none" | "low" | "medium" | "high" | "critical";

export type SourceMutationPolicy = "read_only" | "safe_auto" | "manual_only" | "no_mutation";
export type SourceVisibilityPolicy = "live_surface" | "fallback_only" | "internal_only" | "quarantine_prone" | "dangerous";

export interface DataSource {
  name: string;
  path: string;
  type: SourceType;
  runtimeConsumers: string[];
  verticalsAffected: string[];
  status: SourceStatus;
  risk: SourceRisk;
  entityCount: number;
  safeToMutate: boolean;
  shouldExist: boolean;
  actionNeeded: string;
  trustScore: number;
  mutationPolicy: SourceMutationPolicy;
  visibilityPolicy: SourceVisibilityPolicy;
  mayFeedLiveSurfaces: boolean;
  requiresSanitization: boolean;
}

export type RemediationAction =
  | "auto_fixed"
  | "quarantined"
  | "review_needed"
  | "suppressed"
  | "merge_candidate"
  | "delete_candidate"
  | "remapped"
  | "no_action"
  | "restored"
  | "acknowledged"
  | "downgraded";

export interface RemediationEntry {
  entityId: string;
  source: string;
  action: RemediationAction;
  field?: string;
  beforeState: string;
  afterState: string;
  reason: string;
  confidence: "high" | "medium" | "low";
  timestamp: string;
  engineName?: string;
  decisionTier?: DecisionTier;
  playbook?: string;
}

export interface QuarantineEntry {
  entityId: string;
  source: string;
  vertical: string;
  title: string;
  classification: EntityClassification;
  reasonCodes: string[];
  quarantinedAt: string;
  reviewable: boolean;
  quarantinedBy?: string;
  visibilityEffect?: SurfaceVisibility;
  reviewNotes?: string;
  restorable?: boolean;
  restorePath?: string;
}

export interface AuditSummary {
  totalEntities: number;
  totalSources: number;
  byClassification: Record<EntityClassification, number>;
  byVertical: Record<string, { total: number; valid: number; issues: number }>;
  bySource: Record<string, { total: number; valid: number; issues: number }>;
  byIssueSeverity: Record<IssueSeverity, number>;
  byIssueCategory: Record<IssueCategory, number>;
  quarantined: number;
  autoFixed: number;
  reviewNeeded: number;
  duplicatesFound: number;
  orphansFound: number;
  crossVerticalCount: number;
  brokenMediaCount: number;
  timestamp: string;
  executionMode?: ExecutionMode;
  engineRunSummaries?: EngineRunSummary[];
}

export interface FullAuditReport {
  summary: AuditSummary;
  sources: DataSource[];
  findings: EntityFinding[];
  remediations: RemediationEntry[];
  quarantine: QuarantineEntry[];
  qualityRecords?: EntityQualityRecord[];
  engineRuns?: EngineRunLog[];
}

export interface EngineRunLog {
  engineName: string;
  startedAt: string;
  completedAt: string;
  mode: ExecutionMode;
  cadence: SweepCadence;
  entitiesScanned: number;
  issuesFound: number;
  autoFixed: number;
  quarantined: number;
  suppressed: number;
  reviewNeeded: number;
  errors: number;
  status: "success" | "partial" | "failed";
  batchSize: number;
  message?: string;
}

export interface EngineRunSummary {
  engineName: string;
  lastRun: string;
  status: "success" | "partial" | "failed" | "never_run";
  entitiesProcessed: number;
  issuesFound: number;
  actionsApplied: number;
}

export type PlaybookId =
  | "wrong_taxonomy_remap"
  | "wrong_route_remap"
  | "exact_duplicate_suppress"
  | "legacy_mock_suppress"
  | "broken_reference_isolate"
  | "broken_media_suppress"
  | "missing_field_downgrade"
  | "shadow_dataset_exclude"
  | "search_index_cleanup"
  | "surface_rebuild";

export interface RemediationPlaybook {
  id: PlaybookId;
  name: string;
  triggerConditions: string[];
  confidenceRequired: "high" | "medium";
  action: RemediationAction;
  decisionTier: DecisionTier;
  logging: string;
  rollbackSupported: boolean;
  description: string;
}

export type ProtectedSurface =
  | "dashboard_cards"
  | "stories"
  | "carousels"
  | "featured_sections"
  | "category_pages"
  | "search_results"
  | "discovery_cards"
  | "recommendation_feed"
  | "marketplace_listings"
  | "vertical_hubs";

export interface SurfaceProtectionRule {
  surface: ProtectedSurface;
  excludeQuarantined: boolean;
  excludeInvalid: boolean;
  excludeDuplicates: boolean;
  excludeBrokenReferences: boolean;
  excludeBrokenMedia: boolean;
  excludeLegacyShadow: boolean;
  excludeLowTrust: boolean;
  minQualityScore?: number;
  minTrustLevel?: TrustLevel;
}
