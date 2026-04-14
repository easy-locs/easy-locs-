import { platformBus } from "@/lib/shared/platform-bus";
import { receiveViolation, type ViolationReport } from "@/lib/control-plane/enforcement-hub";
import { recordObservabilityProof } from "@/lib/enforcement/observability";

export type QuarantineEntityType =
  | "asset"
  | "data_record"
  | "page"
  | "feature"
  | "provider"
  | "import"
  | "event"
  | "listing"
  | "media"
  | "taxonomy_node";

export type QuarantineReasonCode =
  | "MISSING_FIELDS"
  | "TAXONOMY_CONFLICT"
  | "MEDIA_MISMATCH"
  | "LOW_CONFIDENCE"
  | "DUPLICATE_CONFLICT"
  | "CANONICAL_CONFLICT"
  | "CROSS_VERTICAL_CONTAMINATION"
  | "GATE_FAILURE"
  | "SECURITY_VIOLATION"
  | "MALFORMED_EVENT"
  | "INCOMPLETE_IMPORT"
  | "PARTIAL_WIRING"
  | "UNSTABLE_PROVIDER"
  | "DATA_INTEGRITY_FAILURE"
  | "INGESTION_REJECTION";

export type ReviewStatus = "pending" | "in_review" | "approved" | "rejected" | "escalated";

export interface QuarantineItem {
  id: string;
  entityId: string;
  entityType: QuarantineEntityType;
  reason: QuarantineReasonCode;
  details: string;
  source: string;
  quarantinedAt: string;
  confidenceScore: number | null;
  repairSuggestion: string | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  resolvedAt: string | null;
  resolution: "approved" | "rejected" | "reclassified" | "auto_repaired" | null;
  metadata: Record<string, unknown>;
}

const quarantineStore: QuarantineItem[] = [];
const MAX_STORE = 5000;
let itemCounter = 0;

export function quarantineEntity(opts: {
  entityId: string;
  entityType: QuarantineEntityType;
  reason: QuarantineReasonCode;
  details: string;
  source: string;
  confidenceScore?: number | null;
  repairSuggestion?: string | null;
  metadata?: Record<string, unknown>;
}): QuarantineItem {
  itemCounter++;
  const item: QuarantineItem = {
    id: `q-${Date.now()}-${itemCounter}`,
    entityId: opts.entityId,
    entityType: opts.entityType,
    reason: opts.reason,
    details: opts.details,
    source: opts.source,
    quarantinedAt: new Date().toISOString(),
    confidenceScore: opts.confidenceScore ?? null,
    repairSuggestion: opts.repairSuggestion ?? null,
    reviewStatus: "pending",
    reviewedBy: null,
    reviewedAt: null,
    resolvedAt: null,
    resolution: null,
    metadata: opts.metadata ?? {},
  };

  quarantineStore.push(item);
  if (quarantineStore.length > MAX_STORE) {
    quarantineStore.splice(0, quarantineStore.length - MAX_STORE);
  }

  recordObservabilityProof({
    id: `proof-quarantine-${item.id}`,
    source: opts.source,
    category: "quarantine",
    timestamp: item.quarantinedAt,
    what: `Entity ${opts.entityId} (${opts.entityType}) quarantined`,
    why: `${opts.reason}: ${opts.details}`,
    where: opts.source,
    correction: opts.repairSuggestion ?? "Manual review required",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: "medium",
    metadata: {
      entityId: opts.entityId,
      entityType: opts.entityType,
      reason: opts.reason,
      confidenceScore: opts.confidenceScore,
    },
  });

  platformBus.emit("enforcement:entity_quarantined", {
    quarantineId: item.id,
    entityId: opts.entityId,
    entityType: opts.entityType,
    reason: opts.reason,
  }, "system");

  return item;
}

export function resolveQuarantineItem(
  quarantineId: string,
  resolution: "approved" | "rejected" | "reclassified" | "auto_repaired",
  reviewerId: string,
): QuarantineItem | null {
  const item = quarantineStore.find((q) => q.id === quarantineId);
  if (!item) return null;

  item.reviewStatus = resolution === "approved" ? "approved" : resolution === "rejected" ? "rejected" : "approved";
  item.reviewedBy = reviewerId;
  item.reviewedAt = new Date().toISOString();
  item.resolvedAt = new Date().toISOString();
  item.resolution = resolution;

  platformBus.emit("enforcement:quarantine_resolved", {
    quarantineId,
    entityId: item.entityId,
    resolution,
    reviewerId,
  }, "system");

  return item;
}

export function escalateQuarantineItem(quarantineId: string): QuarantineItem | null {
  const item = quarantineStore.find((q) => q.id === quarantineId);
  if (!item) return null;
  item.reviewStatus = "escalated";
  return item;
}

export function getQuarantineItems(filters?: {
  entityType?: QuarantineEntityType;
  reason?: QuarantineReasonCode;
  reviewStatus?: ReviewStatus;
  limit?: number;
}): QuarantineItem[] {
  let results = [...quarantineStore];
  if (filters?.entityType) results = results.filter((q) => q.entityType === filters.entityType);
  if (filters?.reason) results = results.filter((q) => q.reason === filters.reason);
  if (filters?.reviewStatus) results = results.filter((q) => q.reviewStatus === filters.reviewStatus);
  return results.slice(-(filters?.limit ?? 100));
}

export function getQuarantineById(quarantineId: string): QuarantineItem | null {
  return quarantineStore.find((q) => q.id === quarantineId) ?? null;
}

export function getPendingReviewCount(): number {
  return quarantineStore.filter((q) => q.reviewStatus === "pending" || q.reviewStatus === "in_review").length;
}

export function getQuarantineStats(): {
  total: number;
  pending: number;
  resolved: number;
  escalated: number;
  byEntityType: Record<string, number>;
  byReason: Record<string, number>;
  byReviewStatus: Record<string, number>;
} {
  const pending = quarantineStore.filter((q) => q.reviewStatus === "pending" || q.reviewStatus === "in_review").length;
  const resolved = quarantineStore.filter((q) => q.resolvedAt !== null).length;
  const escalated = quarantineStore.filter((q) => q.reviewStatus === "escalated").length;

  const byEntityType: Record<string, number> = {};
  const byReason: Record<string, number> = {};
  const byReviewStatus: Record<string, number> = {};

  for (const q of quarantineStore) {
    byEntityType[q.entityType] = (byEntityType[q.entityType] ?? 0) + 1;
    byReason[q.reason] = (byReason[q.reason] ?? 0) + 1;
    byReviewStatus[q.reviewStatus] = (byReviewStatus[q.reviewStatus] ?? 0) + 1;
  }

  return {
    total: quarantineStore.length,
    pending,
    resolved,
    escalated,
    byEntityType,
    byReason,
    byReviewStatus,
  };
}

export function clearQuarantineStore(): void {
  quarantineStore.length = 0;
}
