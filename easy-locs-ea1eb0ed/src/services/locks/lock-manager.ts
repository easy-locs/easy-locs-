import type { LockType, EntityLifecycleStatus, AuditLogEntry } from "@/domains/content-pipeline/types";

export interface LockState {
  entityId: string;
  activeLocks: LockType[];
  lockedAt: Record<LockType, string>;
  lockedBy: Record<LockType, string>;
}

export interface LockCheckResult {
  allowed: boolean;
  blockedBy: LockType[];
  reason: string;
}

export function checkTaxonomyLock(locks: LockType[]): LockCheckResult {
  if (locks.includes("taxonomy_lock")) {
    return {
      allowed: false,
      blockedBy: ["taxonomy_lock"],
      reason: "Taxonomy is locked. Category/subcategory/vertical cannot be modified without reclassification workflow.",
    };
  }
  return { allowed: true, blockedBy: [], reason: "Taxonomy is unlocked" };
}

export function checkCanonicalLock(locks: LockType[]): LockCheckResult {
  if (locks.includes("canonical_lock")) {
    return {
      allowed: false,
      blockedBy: ["canonical_lock"],
      reason: "Canonical type is locked. Cannot change canonical type/subtype without reclassification workflow.",
    };
  }
  return { allowed: true, blockedBy: [], reason: "Canonical type is unlocked" };
}

export function checkMediaLock(locks: LockType[]): LockCheckResult {
  if (locks.includes("media_lock")) {
    return {
      allowed: false,
      blockedBy: ["media_lock"],
      reason: "Primary media is locked. Cannot replace primary image with unverified media.",
    };
  }
  return { allowed: true, blockedBy: [], reason: "Media is unlocked" };
}

export function checkPublishLock(locks: LockType[]): LockCheckResult {
  if (locks.includes("publish_lock")) {
    return {
      allowed: false,
      blockedBy: ["publish_lock"],
      reason: "Entity is publish-locked. Cannot unpublish without admin workflow.",
    };
  }
  return { allowed: true, blockedBy: [], reason: "Entity is not publish-locked" };
}

export function checkTemplateLock(locks: LockType[], requestedTemplate: string): LockCheckResult {
  if (locks.includes("template_lock")) {
    return {
      allowed: false,
      blockedBy: ["template_lock"],
      reason: `Template is locked. Cannot render with template "${requestedTemplate}" — only the canonical template is allowed.`,
    };
  }
  return { allowed: true, blockedBy: [], reason: "Template is unlocked" };
}

export function checkRelationshipLock(locks: LockType[]): LockCheckResult {
  if (locks.includes("relationship_lock")) {
    return {
      allowed: false,
      blockedBy: ["relationship_lock"],
      reason: "Relationships are locked. Cannot modify parent-child or cross-vertical links.",
    };
  }
  return { allowed: true, blockedBy: [], reason: "Relationships are unlocked" };
}

export function canEditField(
  field: string,
  locks: LockType[],
): LockCheckResult {
  const taxonomyFields = ["vertical", "category", "subcategory"];
  const canonicalFields = ["canonicalType", "canonicalSubtype", "canonicalPath"];
  const mediaFields = ["primaryMediaId", "coverImage"];

  if (taxonomyFields.includes(field)) return checkTaxonomyLock(locks);
  if (canonicalFields.includes(field)) return checkCanonicalLock(locks);
  if (mediaFields.includes(field)) return checkMediaLock(locks);

  return { allowed: true, blockedBy: [], reason: "Field is not lock-protected" };
}

export function getLocksForPublishedEntity(): LockType[] {
  return [
    "taxonomy_lock",
    "canonical_lock",
    "media_lock",
    "publish_lock",
    "template_lock",
    "relationship_lock",
  ];
}

export function getLocksForApprovedEntity(): LockType[] {
  return [
    "taxonomy_lock",
    "canonical_lock",
    "template_lock",
  ];
}

export function canPublish(
  status: EntityLifecycleStatus,
  locks: LockType[],
  validationPassed: boolean,
): LockCheckResult {
  if (status === "quarantined") {
    return {
      allowed: false,
      blockedBy: [],
      reason: "Entity is quarantined. Cannot publish until resolved.",
    };
  }

  if (status === "rejected") {
    return {
      allowed: false,
      blockedBy: [],
      reason: "Entity is rejected. Cannot publish rejected entities.",
    };
  }

  if (!validationPassed) {
    return {
      allowed: false,
      blockedBy: [],
      reason: "Validation not passed. All gates must pass before publishing.",
    };
  }

  if (status !== "approved" && status !== "published") {
    return {
      allowed: false,
      blockedBy: [],
      reason: `Entity status "${status}" is not eligible for publishing. Must be "approved".`,
    };
  }

  return { allowed: true, blockedBy: [], reason: "Entity is eligible for publishing" };
}

export function canReclassify(
  locks: LockType[],
  requestedBy: "admin" | "system" | "user",
): LockCheckResult {
  const blockedBy: LockType[] = [];

  if (locks.includes("canonical_lock") && requestedBy === "user") {
    blockedBy.push("canonical_lock");
  }
  if (locks.includes("taxonomy_lock") && requestedBy === "user") {
    blockedBy.push("taxonomy_lock");
  }

  if (blockedBy.length > 0) {
    return {
      allowed: false,
      blockedBy,
      reason: "Reclassification requires admin workflow when locks are active.",
    };
  }

  return { allowed: true, blockedBy: [], reason: "Reclassification allowed" };
}
