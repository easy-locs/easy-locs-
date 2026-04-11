import { mapRawToCanonical, MAPPER_VERSION } from "@/services/canonical/mapping-engine";
import { validateMediaForEntity } from "@/services/media-truth/media-truth-engine";
import { runAllGates } from "@/services/validation/gate-runner";
import { evaluateQuarantine } from "@/services/quarantine/quarantine-engine";
import {
  logEntityClassify,
  logEntityQuarantine,
  logMediaRemove,
} from "@/services/audit/audit-logger";
import type {
  CanonicalEntity,
  MediaAsset,
  LegacyAuditResult,
  EntityLifecycleStatus,
} from "@/domains/content-pipeline/types";
import type { CanonicalVertical } from "@/lib/taxonomy/canonical-registry";

export interface LegacyEntity {
  id: string;
  name: string;
  vertical: string;
  category: string;
  subcategory: string;
  canonicalType?: string;
  canonicalSubtype?: string;
  address?: string;
  lat?: number;
  lng?: number;
  phone?: string;
  email?: string;
  description?: string;
  imageUrls: string[];
  primaryImageUrl?: string;
  status: string;
}

export function auditLegacyEntity(
  entity: LegacyEntity,
  existingEntities: Array<{ id: string; name: string; lat: number | null; lng: number | null; canonicalType: string }>,
): {
  action: "passed" | "reclassified" | "quarantined" | "media_fixed" | "duplicate" | "unresolved";
  newCanonicalPath: string | null;
  confidenceScore: number;
  issues: string[];
  mediaIssues: string[];
} {
  const issues: string[] = [];
  const mediaIssues: string[] = [];

  const mappingResult = mapRawToCanonical(
    entity.name,
    entity.category,
    entity.subcategory,
    entity.description || null,
    entity.address || null,
  );

  if (!mappingResult) {
    issues.push("Could not map to any canonical type");
    return {
      action: "unresolved",
      newCanonicalPath: null,
      confidenceScore: 0,
      issues,
      mediaIssues,
    };
  }

  const oldPath = entity.canonicalType
    ? `${entity.vertical}.${entity.category}.${entity.subcategory}.${entity.canonicalType}`
    : null;
  const newPath = mappingResult.canonicalPath;
  const isReclassified = oldPath !== null && oldPath !== newPath;

  if (isReclassified) {
    issues.push(`Reclassified from "${oldPath}" to "${newPath}"`);
  }

  if (entity.imageUrls.length > 0 && mappingResult.vertical) {
    for (const url of entity.imageUrls) {
      const mediaResult = validateMediaForEntity(
        { url },
        entity.name,
        mappingResult.vertical as CanonicalVertical,
        mappingResult.canonicalType,
      );

      if (!mediaResult.valid) {
        mediaIssues.push(`Image "${url.slice(0, 50)}..." failed: ${mediaResult.rejectionReasons.join(", ")}`);
      }

      if (url === entity.primaryImageUrl && !mediaResult.eligibleAsPrimary) {
        mediaIssues.push("Current primary image is not eligible as primary");
      }
    }
  }

  const canonicalEntity: CanonicalEntity = {
    id: entity.id,
    normalizedEntityId: entity.id,
    vertical: mappingResult.vertical,
    category: mappingResult.category,
    subcategory: mappingResult.subcategory,
    canonicalType: mappingResult.canonicalType,
    canonicalSubtype: mappingResult.canonicalSubtype,
    canonicalPath: mappingResult.canonicalPath,
    confidenceScore: mappingResult.confidenceScore,
    confidenceBand: mappingResult.confidenceBand,
    mapperVersion: MAPPER_VERSION,
    validationStatus: "classified",
    publishStatus: entity.status as EntityLifecycleStatus,
    reviewRequired: mappingResult.reviewRequired,
    name: entity.name,
    description: entity.description ?? null,
    address: entity.address ?? null,
    city: null,
    country: null,
    countryCode: null,
    phone: entity.phone ?? null,
    email: entity.email ?? null,
    website: null,
    lat: entity.lat ?? null,
    lng: entity.lng ?? null,
    metadata: {},
    sourceProvenance: {
      sourceType: "legacy",
      sourceId: entity.id,
      sourceUrl: null,
      importedAt: new Date().toISOString(),
      normalizedAt: new Date().toISOString(),
      classifiedAt: new Date().toISOString(),
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mediaAssets: MediaAsset[] = entity.imageUrls.map((url, i) => ({
    id: `legacy_media_${entity.id}_${i}`,
    entityId: entity.id,
    sourceUrl: url,
    sourceType: "legacy" as const,
    sourceProvenance: null,
    storedUrl: url,
    thumbnailUrl: null,
    width: null,
    height: null,
    sizeBytes: null,
    format: null,
    fingerprint: null,
    detectedMediaKind: null,
    entityMatchConfidence: 0.5,
    verticalMatchConfidence: 0.5,
    qualityScore: 50,
    verificationStatus: "imported" as const,
    moderationStatus: "pending" as const,
    lockStatus: "unlocked" as const,
    isPrimary: url === entity.primaryImageUrl,
    rejectionReason: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }));

  const pipelineResult = runAllGates(canonicalEntity, mediaAssets, existingEntities);
  const quarantineDecision = evaluateQuarantine(pipelineResult);

  const duplicateGate = pipelineResult.gateResults.find(g => g.gateId === "duplicate");
  if (duplicateGate && duplicateGate.result === "fail") {
    logEntityQuarantine(entity.id, ["duplicate_conflict"]);
    return {
      action: "duplicate",
      newCanonicalPath: newPath,
      confidenceScore: mappingResult.confidenceScore,
      issues: [...issues, ...duplicateGate.failedChecks],
      mediaIssues,
    };
  }

  if (quarantineDecision.shouldQuarantine) {
    logEntityQuarantine(entity.id, quarantineDecision.reasons);
    return {
      action: "quarantined",
      newCanonicalPath: newPath,
      confidenceScore: mappingResult.confidenceScore,
      issues: [...issues, quarantineDecision.details],
      mediaIssues,
    };
  }

  if (mediaIssues.length > 0) {
    return {
      action: "media_fixed",
      newCanonicalPath: newPath,
      confidenceScore: mappingResult.confidenceScore,
      issues,
      mediaIssues,
    };
  }

  if (isReclassified) {
    logEntityClassify(entity.id, newPath, mappingResult.confidenceScore, MAPPER_VERSION);
    return {
      action: "reclassified",
      newCanonicalPath: newPath,
      confidenceScore: mappingResult.confidenceScore,
      issues,
      mediaIssues,
    };
  }

  return {
    action: "passed",
    newCanonicalPath: newPath,
    confidenceScore: mappingResult.confidenceScore,
    issues,
    mediaIssues,
  };
}

export function runLegacyAudit(
  entities: LegacyEntity[],
): LegacyAuditResult {
  const result: LegacyAuditResult = {
    totalEntities: entities.length,
    passedAutomatically: 0,
    reclassified: 0,
    quarantined: 0,
    wrongMedia: 0,
    duplicatesFound: 0,
    badRenderingsFixed: 0,
    unresolved: 0,
    details: [],
  };

  const existingEntities = entities.map(e => ({
    id: e.id,
    name: e.name,
    lat: e.lat ?? null,
    lng: e.lng ?? null,
    canonicalType: e.canonicalType || "",
  }));

  for (const entity of entities) {
    const auditResult = auditLegacyEntity(entity, existingEntities);

    switch (auditResult.action) {
      case "passed":
        result.passedAutomatically++;
        break;
      case "reclassified":
        result.reclassified++;
        break;
      case "quarantined":
        result.quarantined++;
        break;
      case "media_fixed":
        result.wrongMedia++;
        break;
      case "duplicate":
        result.duplicatesFound++;
        break;
      case "unresolved":
        result.unresolved++;
        break;
    }

    result.details.push({
      entityId: entity.id,
      entityName: entity.name,
      oldPath: entity.canonicalType
        ? `${entity.vertical}.${entity.category}.${entity.subcategory}.${entity.canonicalType}`
        : null,
      newPath: auditResult.newCanonicalPath,
      action: auditResult.action,
      confidenceScore: auditResult.confidenceScore,
      issues: [...auditResult.issues, ...auditResult.mediaIssues],
    });
  }

  return result;
}
