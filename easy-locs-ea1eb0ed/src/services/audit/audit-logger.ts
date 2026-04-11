import type { AuditLogEntry, AuditAction } from "@/domains/content-pipeline/types";

let auditLog: AuditLogEntry[] = [];
const MAX_LOG_SIZE = 10000;

function generateId(): string {
  return `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function logAudit(params: {
  entityId?: string | null;
  mediaAssetId?: string | null;
  action: AuditAction;
  actorId?: string | null;
  actorType: "system" | "user" | "worker" | "admin";
  before?: Record<string, unknown> | null;
  after?: Record<string, unknown> | null;
  reason?: string | null;
  mapperVersion?: string | null;
  validatorVersion?: string | null;
}): AuditLogEntry {
  const entry: AuditLogEntry = {
    id: generateId(),
    entityId: params.entityId ?? null,
    mediaAssetId: params.mediaAssetId ?? null,
    action: params.action,
    actorId: params.actorId ?? null,
    actorType: params.actorType,
    before: params.before ?? null,
    after: params.after ?? null,
    reason: params.reason ?? null,
    mapperVersion: params.mapperVersion ?? null,
    validatorVersion: params.validatorVersion ?? null,
    timestamp: new Date().toISOString(),
  };

  auditLog.push(entry);
  if (auditLog.length > MAX_LOG_SIZE) {
    auditLog = auditLog.slice(-MAX_LOG_SIZE);
  }

  return entry;
}

export function logEntityImport(entityId: string, sourceType: string, sourceId: string): AuditLogEntry {
  return logAudit({
    entityId,
    action: "import",
    actorType: "system",
    after: { sourceType, sourceId },
    reason: `Imported from ${sourceType}`,
  });
}

export function logEntityNormalize(entityId: string, before: Record<string, unknown>, after: Record<string, unknown>): AuditLogEntry {
  return logAudit({
    entityId,
    action: "normalize",
    actorType: "system",
    before,
    after,
    reason: "Normalized entity fields",
  });
}

export function logEntityClassify(
  entityId: string,
  canonicalPath: string,
  confidenceScore: number,
  mapperVersion: string,
): AuditLogEntry {
  return logAudit({
    entityId,
    action: "classify",
    actorType: "system",
    after: { canonicalPath, confidenceScore },
    mapperVersion,
    reason: `Classified as ${canonicalPath} (confidence: ${confidenceScore})`,
  });
}

export function logEntityValidate(
  entityId: string,
  gateResults: Array<{ gateId: string; result: string }>,
  validatorVersion: string,
): AuditLogEntry {
  return logAudit({
    entityId,
    action: "validate",
    actorType: "system",
    after: { gateResults },
    validatorVersion,
    reason: `Validated through ${gateResults.length} gates`,
  });
}

export function logEntityApprove(entityId: string, reviewerId: string, notes?: string): AuditLogEntry {
  return logAudit({
    entityId,
    action: "approve",
    actorId: reviewerId,
    actorType: "admin",
    reason: notes || "Entity approved by reviewer",
  });
}

export function logEntityReject(entityId: string, reviewerId: string, reason: string): AuditLogEntry {
  return logAudit({
    entityId,
    action: "reject",
    actorId: reviewerId,
    actorType: "admin",
    reason,
  });
}

export function logEntityPublish(entityId: string, actorId?: string): AuditLogEntry {
  return logAudit({
    entityId,
    action: "publish",
    actorId,
    actorType: actorId ? "admin" : "system",
    reason: "Entity published to public",
  });
}

export function logEntityQuarantine(entityId: string, reasons: string[]): AuditLogEntry {
  return logAudit({
    entityId,
    action: "quarantine",
    actorType: "system",
    after: { reasons },
    reason: `Quarantined: ${reasons.join(", ")}`,
  });
}

export function logEntityReclassify(
  entityId: string,
  oldPath: string,
  newPath: string,
  actorId: string,
  reason: string,
): AuditLogEntry {
  return logAudit({
    entityId,
    action: "reclassify",
    actorId,
    actorType: "admin",
    before: { canonicalPath: oldPath },
    after: { canonicalPath: newPath },
    reason,
  });
}

export function logMediaAssign(entityId: string, mediaAssetId: string, isPrimary: boolean): AuditLogEntry {
  return logAudit({
    entityId,
    mediaAssetId,
    action: "media_assign",
    actorType: "system",
    after: { isPrimary },
    reason: isPrimary ? "Primary media assigned" : "Media attached to entity",
  });
}

export function logMediaRemove(entityId: string, mediaAssetId: string, reason: string): AuditLogEntry {
  return logAudit({
    entityId,
    mediaAssetId,
    action: "media_remove",
    actorType: "system",
    reason,
  });
}

export function logMediaLock(mediaAssetId: string, entityId: string): AuditLogEntry {
  return logAudit({
    entityId,
    mediaAssetId,
    action: "media_lock",
    actorType: "system",
    reason: "Primary media locked",
  });
}

export function logFieldEdit(
  entityId: string,
  field: string,
  before: unknown,
  after: unknown,
  actorId: string,
): AuditLogEntry {
  return logAudit({
    entityId,
    action: "field_edit",
    actorId,
    actorType: "admin",
    before: { [field]: before },
    after: { [field]: after },
    reason: `Field "${field}" changed`,
  });
}

export function getAuditLog(entityId?: string): AuditLogEntry[] {
  if (entityId) {
    return auditLog.filter(e => e.entityId === entityId);
  }
  return [...auditLog];
}

export function getAuditLogByMedia(mediaAssetId: string): AuditLogEntry[] {
  return auditLog.filter(e => e.mediaAssetId === mediaAssetId);
}

export function clearAuditLog(): void {
  auditLog = [];
}
