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

export interface EntityIssue {
  category: IssueCategory;
  severity: IssueSeverity;
  code: string;
  message: string;
  field?: string;
  expected?: string;
  actual?: string;
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
}

export type SourceType =
  | "fallback_static"
  | "db_table"
  | "search_index"
  | "seed_file"
  | "mock"
  | "legacy"
  | "runtime_generated";

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
}

export type RemediationAction =
  | "auto_fixed"
  | "quarantined"
  | "review_needed"
  | "suppressed"
  | "merge_candidate"
  | "delete_candidate"
  | "remapped"
  | "no_action";

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
}

export interface FullAuditReport {
  summary: AuditSummary;
  sources: DataSource[];
  findings: EntityFinding[];
  remediations: RemediationEntry[];
  quarantine: QuarantineEntry[];
}
