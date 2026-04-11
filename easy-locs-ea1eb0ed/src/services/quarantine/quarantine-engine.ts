import type {
  QuarantineEntry,
  QuarantineReason,
  ValidationGateId,
  GateCheckOutput,
  PipelineResult,
  EntityLifecycleStatus,
} from "@/domains/content-pipeline/types";

export interface QuarantineDecision {
  shouldQuarantine: boolean;
  reasons: QuarantineReason[];
  failedGates: ValidationGateId[];
  severity: "low" | "medium" | "high" | "critical";
  details: string;
}

export function evaluateQuarantine(pipelineResult: PipelineResult): QuarantineDecision {
  const reasons: QuarantineReason[] = [];
  const failedGates: ValidationGateId[] = [];

  for (const gate of pipelineResult.gateResults) {
    if (gate.result === "fail") {
      failedGates.push(gate.gateId);

      switch (gate.gateId) {
        case "schema":
          reasons.push("missing_required_fields");
          break;
        case "taxonomy":
          reasons.push("taxonomy_conflict");
          break;
        case "media":
          reasons.push("media_mismatch");
          break;
        case "confidence":
          reasons.push("low_confidence");
          break;
        case "duplicate":
          reasons.push("duplicate_conflict");
          break;
        case "canonical_integrity":
          reasons.push("canonical_conflict");
          break;
        case "publish":
          reasons.push("gate_failure");
          break;
      }
    }
  }

  if (pipelineResult.confidenceScore < 0.5) {
    if (!reasons.includes("low_confidence")) reasons.push("low_confidence");
  }

  const shouldQuarantine = reasons.length > 0;

  let severity: "low" | "medium" | "high" | "critical" = "low";
  if (reasons.includes("cross_vertical_contamination") || reasons.includes("canonical_conflict")) {
    severity = "critical";
  } else if (reasons.includes("taxonomy_conflict") || reasons.includes("media_mismatch")) {
    severity = "high";
  } else if (reasons.includes("low_confidence") || reasons.includes("duplicate_conflict")) {
    severity = "medium";
  }

  const details = shouldQuarantine
    ? `Quarantined: ${reasons.join(", ")} (failed gates: ${failedGates.join(", ")})`
    : "No quarantine needed";

  return {
    shouldQuarantine,
    reasons,
    failedGates,
    severity,
    details,
  };
}

export function buildQuarantineEntry(
  entityId: string,
  decision: QuarantineDecision,
  confidenceScore: number | null,
): Omit<QuarantineEntry, "id"> {
  return {
    entityId,
    mediaAssetId: null,
    reason: decision.reasons[0] || "gate_failure",
    details: decision.details,
    failedGates: decision.failedGates,
    confidenceScore,
    quarantinedAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
    reviewerId: null,
  };
}

export function buildMediaQuarantineEntry(
  mediaAssetId: string,
  reason: QuarantineReason,
  details: string,
): Omit<QuarantineEntry, "id"> {
  return {
    entityId: null,
    mediaAssetId,
    reason,
    details,
    failedGates: ["media"],
    confidenceScore: null,
    quarantinedAt: new Date().toISOString(),
    resolvedAt: null,
    resolution: null,
    reviewerId: null,
  };
}

export function resolveQuarantine(
  entry: QuarantineEntry,
  resolution: "approved" | "rejected" | "reclassified",
  reviewerId: string,
): QuarantineEntry {
  return {
    ...entry,
    resolvedAt: new Date().toISOString(),
    resolution,
    reviewerId,
  };
}

export function isQuarantined(status: EntityLifecycleStatus): boolean {
  return status === "quarantined";
}

export function shouldExcludeFromPublic(status: EntityLifecycleStatus): boolean {
  const ALLOWED_PUBLIC_STATUSES: EntityLifecycleStatus[] = ["published"];
  return !ALLOWED_PUBLIC_STATUSES.includes(status);
}

export function getQuarantinePriority(reasons: QuarantineReason[]): "low" | "medium" | "high" | "critical" {
  if (reasons.includes("cross_vertical_contamination") || reasons.includes("canonical_conflict")) return "critical";
  if (reasons.includes("taxonomy_conflict") || reasons.includes("media_mismatch")) return "high";
  if (reasons.includes("low_confidence") || reasons.includes("duplicate_conflict")) return "medium";
  return "low";
}
