import type {
  CanonicalEntity,
  MediaAsset,
  GateCheckOutput,
  ValidationGateId,
  GateResult,
  QuarantineReason,
  PipelineResult,
  EntityLifecycleStatus,
  AuditLogEntry,
} from "@/domains/content-pipeline/types";
import { capturePipelineFailure, addDomainBreadcrumb } from "@/lib/observability/sentry-helpers";
import {
  isValidVertical,
  isValidCategoryChain,
  validateCanonicalNode,
  getAllowedMediaKinds,
  isMediaKindAllowed,
  type CanonicalVertical,
  type MediaKind,
} from "@/lib/taxonomy/canonical-registry";

export const GATE_ORDER: ValidationGateId[] = [
  "schema",
  "taxonomy",
  "media",
  "confidence",
  "duplicate",
  "canonical_integrity",
  "publish",
];

export function runSchemaGate(entity: CanonicalEntity): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  if (!entity.name || entity.name.trim().length < 2) {
    failedChecks.push("name is missing or too short");
  } else {
    passedChecks.push("name present");
  }

  if (!entity.vertical) {
    failedChecks.push("vertical is missing");
  } else {
    passedChecks.push("vertical present");
  }

  if (!entity.category) {
    failedChecks.push("category is missing");
  } else {
    passedChecks.push("category present");
  }

  if (!entity.subcategory) {
    failedChecks.push("subcategory is missing");
  } else {
    passedChecks.push("subcategory present");
  }

  if (!entity.canonicalType) {
    failedChecks.push("canonicalType is missing");
  } else {
    passedChecks.push("canonicalType present");
  }

  if (!entity.canonicalPath) {
    failedChecks.push("canonicalPath is missing");
  } else {
    passedChecks.push("canonicalPath present");
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "schema",
    result,
    details: failedChecks.length > 0
      ? `Schema validation failed: ${failedChecks.join(", ")}`
      : "All required fields present",
    riskFlags: failedChecks.length > 0 ? ["missing_required_fields"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runTaxonomyGate(entity: CanonicalEntity): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  if (!isValidVertical(entity.vertical)) {
    failedChecks.push(`Invalid vertical "${entity.vertical}"`);
  } else {
    passedChecks.push("vertical is valid");
  }

  if (entity.vertical && entity.category && entity.subcategory) {
    if (isValidCategoryChain(entity.vertical, entity.category, entity.subcategory)) {
      passedChecks.push("category chain is valid");
    } else {
      failedChecks.push(`Invalid category chain: ${entity.vertical}.${entity.category}.${entity.subcategory}`);
    }
  }

  if (entity.canonicalType) {
    const validation = validateCanonicalNode({
      vertical: entity.vertical,
      category: entity.category,
      subcategory: entity.subcategory,
      canonicalType: entity.canonicalType,
      canonicalSubtype: entity.canonicalSubtype,
    });
    if (validation.valid) {
      passedChecks.push("canonical node is valid");
    } else {
      failedChecks.push(...validation.errors);
    }
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "taxonomy",
    result,
    details: failedChecks.length > 0
      ? `Taxonomy validation failed: ${failedChecks.join(", ")}`
      : "Taxonomy chain is valid",
    riskFlags: failedChecks.length > 0 ? ["taxonomy_conflict"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runMediaGate(
  entity: CanonicalEntity,
  mediaAssets: MediaAsset[],
): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  if (mediaAssets.length === 0) {
    failedChecks.push("No media assets attached");
  } else {
    passedChecks.push(`${mediaAssets.length} media assets found`);
  }

  const hasPrimary = mediaAssets.some(a => a.isPrimary);
  if (!hasPrimary && mediaAssets.length > 0) {
    failedChecks.push("No primary media designated");
  } else if (hasPrimary) {
    passedChecks.push("Primary media designated");
  }

  const allowedKinds = getAllowedMediaKinds(entity.canonicalType);
  if (allowedKinds.length > 0) {
    for (const asset of mediaAssets) {
      if (asset.detectedMediaKind && !isMediaKindAllowed(entity.canonicalType, asset.detectedMediaKind)) {
        failedChecks.push(`Media ${asset.id} kind "${asset.detectedMediaKind}" not allowed for type "${entity.canonicalType}"`);
      }
    }
  }

  for (const asset of mediaAssets) {
    if (asset.isPrimary && (asset.verificationStatus === "rejected" || asset.verificationStatus === "quarantined")) {
      failedChecks.push(`Primary media ${asset.id} has status "${asset.verificationStatus}"`);
    }
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "media",
    result,
    details: failedChecks.length > 0
      ? `Media validation issues: ${failedChecks.join(", ")}`
      : "Media assets are valid",
    riskFlags: failedChecks.length > 0 ? ["media_mismatch"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runConfidenceGate(entity: CanonicalEntity): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  if (entity.confidenceScore >= 0.95) {
    passedChecks.push(`High confidence: ${entity.confidenceScore}`);
  } else if (entity.confidenceScore >= 0.80) {
    passedChecks.push(`Medium confidence: ${entity.confidenceScore}`);
    failedChecks.push("Medium confidence requires review");
  } else if (entity.confidenceScore >= 0.50) {
    failedChecks.push(`Low confidence: ${entity.confidenceScore}`);
  } else {
    failedChecks.push(`Rejected confidence: ${entity.confidenceScore}`);
  }

  const result: GateResult =
    entity.confidenceScore >= 0.95 ? "pass" :
    entity.confidenceScore >= 0.80 ? "warn" : "fail";

  return {
    gateId: "confidence",
    result,
    details: `Confidence score: ${entity.confidenceScore} (${entity.confidenceBand})`,
    riskFlags: entity.confidenceScore < 0.80 ? ["low_confidence"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runDuplicateGate(
  entity: CanonicalEntity,
  existingEntities: Array<{ id: string; name: string; lat: number | null; lng: number | null; canonicalType: string }>,
): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  const normalizedName = entity.name.toLowerCase().trim();

  for (const existing of existingEntities) {
    if (existing.id === entity.id) continue;

    const existingName = existing.name.toLowerCase().trim();
    const nameMatch = normalizedName === existingName || levenshteinSimilarity(normalizedName, existingName) > 0.85;

    let geoMatch = false;
    if (entity.lat != null && entity.lng != null && existing.lat != null && existing.lng != null) {
      const distance = haversineDistance(entity.lat, entity.lng, existing.lat, existing.lng);
      geoMatch = distance < 0.1;
    }

    if (nameMatch && geoMatch) {
      failedChecks.push(`Potential duplicate of "${existing.name}" (${existing.id})`);
    } else if (nameMatch && existing.canonicalType === entity.canonicalType) {
      failedChecks.push(`Name match with "${existing.name}" (${existing.id}) - same canonical type`);
    }
  }

  if (failedChecks.length === 0) {
    passedChecks.push("No duplicates detected");
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "duplicate",
    result,
    details: failedChecks.length > 0
      ? `Duplicate/conflict detected: ${failedChecks.join(", ")}`
      : "No duplicates detected",
    riskFlags: failedChecks.length > 0 ? ["duplicate_conflict"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runCanonicalIntegrityGate(entity: CanonicalEntity): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  if (!entity.canonicalType) {
    failedChecks.push("Missing primary canonical type");
  } else {
    passedChecks.push("Has primary canonical type");
  }

  const pathParts = entity.canonicalPath.split(".");
  if (pathParts.length < 4) {
    failedChecks.push(`Canonical path too short: "${entity.canonicalPath}"`);
  } else {
    passedChecks.push("Canonical path has correct depth");
  }

  if (pathParts[0] !== entity.vertical) {
    failedChecks.push(`Path vertical "${pathParts[0]}" doesn't match entity vertical "${entity.vertical}" — cross-vertical contamination`);
  } else {
    passedChecks.push("Path vertical matches entity vertical");
  }

  if (entity.category && entity.vertical) {
    const chainValid = isValidCategoryChain(
      entity.vertical,
      entity.category,
      entity.subcategory || "",
      entity.canonicalType,
    );
    if (!chainValid) {
      failedChecks.push(`Category chain "${entity.vertical}.${entity.category}.${entity.subcategory}.${entity.canonicalType}" is not registered in canonical taxonomy`);
    } else {
      passedChecks.push("Category chain validated against canonical registry");
    }
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "canonical_integrity",
    result,
    details: failedChecks.length > 0
      ? `Canonical integrity issues: ${failedChecks.join(", ")}`
      : "Canonical integrity verified",
    riskFlags: failedChecks.length > 0 ? ["canonical_conflict"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runPublishGate(
  entity: CanonicalEntity,
  previousGates: GateCheckOutput[],
): GateCheckOutput {
  const failedChecks: string[] = [];
  const passedChecks: string[] = [];

  const allPreviousPassed = previousGates.every(g => g.result === "pass");
  const hasWarnings = previousGates.some(g => g.result === "warn");
  const hasFails = previousGates.some(g => g.result === "fail");

  if (hasFails) {
    const failedGates = previousGates.filter(g => g.result === "fail").map(g => g.gateId);
    failedChecks.push(`Required gates failed: ${failedGates.join(", ")}`);
  }

  if (hasWarnings) {
    failedChecks.push("Gates have warnings — manual review required before publish");
  }

  if (!hasFails && !hasWarnings) {
    passedChecks.push("All 6 required gates passed cleanly");
  }

  if (entity.confidenceBand === "rejected" || entity.confidenceBand === "low") {
    failedChecks.push(`Confidence band "${entity.confidenceBand}" too low for publish`);
  }

  if (entity.reviewRequired && entity.validationStatus !== "approved") {
    failedChecks.push("Review required but entity not approved");
  }

  const result: GateResult = failedChecks.length > 0 ? "fail" : "pass";

  return {
    gateId: "publish",
    result,
    details: failedChecks.length > 0
      ? `Publish blocked: ${failedChecks.join(", ")}`
      : "Eligible for publishing",
    riskFlags: failedChecks.length > 0 ? ["publish_blocked"] : [],
    failedChecks,
    passedChecks,
  };
}

export function runAllGates(
  entity: CanonicalEntity,
  mediaAssets: MediaAsset[],
  existingEntities: Array<{ id: string; name: string; lat: number | null; lng: number | null; canonicalType: string }>,
): PipelineResult {
  const gates: GateCheckOutput[] = [];

  gates.push(runSchemaGate(entity));
  gates.push(runTaxonomyGate(entity));
  gates.push(runMediaGate(entity, mediaAssets));
  gates.push(runConfidenceGate(entity));
  gates.push(runDuplicateGate(entity, existingEntities));
  gates.push(runCanonicalIntegrityGate(entity));
  gates.push(runPublishGate(entity, gates.slice(0, 6)));

  const failedGates = gates.filter(g => g.result === "fail");
  const passedAllGates = failedGates.length === 0;

  const quarantineReasons: QuarantineReason[] = [];
  for (const gate of failedGates) {
    if (gate.gateId === "taxonomy") quarantineReasons.push("taxonomy_conflict");
    if (gate.gateId === "media") quarantineReasons.push("media_mismatch");
    if (gate.gateId === "confidence") quarantineReasons.push("low_confidence");
    if (gate.gateId === "duplicate") quarantineReasons.push("duplicate_conflict");
    if (gate.gateId === "canonical_integrity") quarantineReasons.push("canonical_conflict");
    if (gate.gateId === "schema") quarantineReasons.push("missing_required_fields");
  }

  const quarantined = quarantineReasons.length > 0;

  let status: EntityLifecycleStatus;
  if (quarantined) {
    status = "quarantined";
  } else if (gates.some(g => g.result === "warn")) {
    status = "needs_review";
  } else if (passedAllGates) {
    status = "approved";
  } else {
    status = "rejected";
  }

  const publishEligible = passedAllGates && !quarantined;
  const reviewRequired = gates.some(g => g.result === "warn");

  if (failedGates.length > 0) {
    capturePipelineFailure(
      "gate_validation",
      entity.id,
      failedGates.map(g => g.gateId),
      {
        canonicalPath: entity.canonicalPath,
        confidenceScore: entity.confidenceScore,
        status,
      },
    );
  }

  addDomainBreadcrumb("canonical", "gates.completed", {
    entityId: entity.id,
    passed: passedAllGates,
    failedCount: failedGates.length,
    status,
  });

  const pipelineResult: PipelineResult = {
    entityId: entity.id,
    status,
    canonicalPath: entity.canonicalPath,
    confidenceScore: entity.confidenceScore,
    confidenceBand: entity.confidenceBand,
    gateResults: gates,
    passedAllGates,
    quarantined,
    quarantineReasons,
    publishEligible,
    reviewRequired,
    auditTrail: [],
  };

  if (quarantined || failedGates.length > 0) {
    try {
      import("@/lib/auto-protect").then(({ protectPipeline }) => {
        protectPipeline(pipelineResult);
      }).catch(() => {});
    } catch {}
  }

  return pipelineResult;
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function levenshteinSimilarity(a: string, b: string): number {
  if (a === b) return 1;
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  if (longer.length === 0) return 1;

  const costs: number[] = [];
  for (let i = 0; i <= shorter.length; i++) {
    let lastValue = i;
    for (let j = 0; j <= longer.length; j++) {
      if (i === 0) {
        costs[j] = j;
      } else if (j > 0) {
        let newValue = costs[j - 1];
        if (shorter[i - 1] !== longer[j - 1]) {
          newValue = Math.min(newValue, lastValue, costs[j]) + 1;
        }
        costs[j - 1] = lastValue;
        lastValue = newValue;
      }
    }
    if (i > 0) costs[longer.length] = lastValue;
  }

  return 1 - costs[longer.length] / longer.length;
}
