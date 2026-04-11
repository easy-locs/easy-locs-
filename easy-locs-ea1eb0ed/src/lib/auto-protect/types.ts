import type { ObservabilityDomain } from "@/lib/observability/sentry-helpers";
import type { QuarantineReason, ValidationGateId } from "@/domains/content-pipeline/types";

export type ProtectionSeverity = "low" | "medium" | "high" | "critical";

export type ProtectionAction =
  | "auto_fixed"
  | "blocked"
  | "quarantined"
  | "retried"
  | "fallback_rendered"
  | "rate_limited"
  | "challenged"
  | "frozen"
  | "hidden"
  | "escalated"
  | "review_queued";

export type ProtectionDomain =
  | "ui"
  | "taxonomy"
  | "canonical"
  | "media"
  | "scraping"
  | "wallet"
  | "identity"
  | "orbit"
  | "public_seo"
  | "marketplace"
  | "rendering";

export type IssueCategory =
  | "render_mismatch"
  | "taxonomy_mismatch"
  | "canonical_conflict"
  | "media_mismatch"
  | "import_invalid"
  | "wallet_inconsistent"
  | "otp_abuse"
  | "auth_suspicious"
  | "thread_corrupt"
  | "public_invalid"
  | "card_broken"
  | "template_invalid"
  | "cross_vertical"
  | "duplicate_content"
  | "low_confidence"
  | "missing_data"
  | "ui_normalization";

export interface DetectedIssue {
  id: string;
  domain: ProtectionDomain;
  category: IssueCategory;
  severity: ProtectionSeverity;
  message: string;
  entityId?: string;
  mediaAssetId?: string;
  userId?: string;
  route?: string;
  metadata: Record<string, unknown>;
  detectedAt: string;
}

export interface ProtectionReaction {
  issueId: string;
  action: ProtectionAction;
  domain: ProtectionDomain;
  severity: ProtectionSeverity;
  details: string;
  autoFixed: boolean;
  verified: boolean;
  verificationResult?: string;
  remainingRisk: string;
  reactedAt: string;
}

export interface ProtectionReport {
  issue: DetectedIssue;
  reaction: ProtectionReaction;
  cycle: "detect" | "classify" | "react" | "protect" | "verify" | "report";
}

export interface RateLimitState {
  key: string;
  count: number;
  windowStart: number;
  windowMs: number;
  limit: number;
  blocked: boolean;
}

export interface SafeAutoFixRule {
  id: string;
  category: IssueCategory;
  condition: (issue: DetectedIssue) => boolean;
  fix: (issue: DetectedIssue) => ProtectionReaction;
  description: string;
}
