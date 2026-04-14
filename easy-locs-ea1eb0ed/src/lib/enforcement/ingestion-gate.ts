import { platformBus } from "@/lib/shared/platform-bus";
import { receiveViolation, type ViolationReport } from "@/lib/control-plane/enforcement-hub";
import { recordObservabilityProof, type ObservabilityProof } from "./observability";

export interface IngestionScores {
  sourceTrust: number;
  fieldCompleteness: number;
  taxonomyConfidence: number;
  mediaConfidence: number;
  dedupConfidence: number;
  canonicalMappingConfidence: number;
}

export interface IngestionThresholds {
  sourceTrust: number;
  fieldCompleteness: number;
  taxonomyConfidence: number;
  mediaConfidence: number;
  dedupConfidence: number;
  canonicalMappingConfidence: number;
}

export type IngestionDecision = "accept" | "quarantine" | "reject";

export interface IngestionResult {
  entityId: string;
  decision: IngestionDecision;
  scores: IngestionScores;
  failedDimensions: string[];
  reasonCodes: string[];
  overallScore: number;
  timestamp: string;
}

const DEFAULT_THRESHOLDS: IngestionThresholds = {
  sourceTrust: 0.6,
  fieldCompleteness: 0.7,
  taxonomyConfidence: 0.65,
  mediaConfidence: 0.5,
  dedupConfidence: 0.7,
  canonicalMappingConfidence: 0.6,
};

let activeThresholds: IngestionThresholds = { ...DEFAULT_THRESHOLDS };

const ingestionLog: IngestionResult[] = [];
const MAX_LOG = 1000;

export function setIngestionThresholds(thresholds: Partial<IngestionThresholds>): void {
  activeThresholds = { ...activeThresholds, ...thresholds };
}

export function getIngestionThresholds(): IngestionThresholds {
  return { ...activeThresholds };
}

export function scoreSourceTrust(source: string, metadata?: Record<string, unknown>): number {
  const trustedSources = new Set([
    "canonical_registry", "admin_import", "verified_provider", "api_partner",
  ]);
  if (trustedSources.has(source)) return 1.0;

  const moderateSources = new Set([
    "scraper_verified", "user_submission_reviewed", "migration",
  ]);
  if (moderateSources.has(source)) return 0.7;

  const lowSources = new Set(["scraper_unverified", "user_submission", "bulk_import"]);
  if (lowSources.has(source)) return 0.4;

  return 0.3;
}

export function scoreFieldCompleteness(entity: Record<string, unknown>, requiredFields: string[]): number {
  if (requiredFields.length === 0) return 1.0;
  let present = 0;
  for (const field of requiredFields) {
    const value = entity[field];
    if (value !== undefined && value !== null && value !== "") present++;
  }
  return present / requiredFields.length;
}

export function scoreTaxonomyConfidence(
  vertical?: string,
  category?: string,
  subcategory?: string,
  canonicalType?: string,
): number {
  let score = 0;
  if (vertical) score += 0.3;
  if (category) score += 0.25;
  if (subcategory) score += 0.25;
  if (canonicalType) score += 0.2;
  return score;
}

export function scoreMediaConfidence(
  mediaCount: number,
  hasPrimary: boolean,
  allVerified: boolean,
): number {
  if (mediaCount === 0) return 0;
  let score = Math.min(mediaCount / 3, 1.0) * 0.4;
  if (hasPrimary) score += 0.3;
  if (allVerified) score += 0.3;
  return Math.min(score, 1.0);
}

export function scoreDedupConfidence(
  duplicateMatches: number,
  bestMatchSimilarity: number,
): number {
  if (duplicateMatches === 0) return 1.0;
  if (bestMatchSimilarity > 0.95) return 0.1;
  if (bestMatchSimilarity > 0.85) return 0.3;
  if (bestMatchSimilarity > 0.7) return 0.5;
  return 0.7;
}

export function scoreCanonicalMapping(
  hasCanonicalPath: boolean,
  pathValid: boolean,
  pathDepth: number,
): number {
  if (!hasCanonicalPath) return 0;
  let score = 0.4;
  if (pathValid) score += 0.4;
  if (pathDepth >= 4) score += 0.2;
  else if (pathDepth >= 3) score += 0.1;
  return Math.min(score, 1.0);
}

export function evaluateIngestion(
  entityId: string,
  scores: IngestionScores,
  thresholds?: Partial<IngestionThresholds>,
): IngestionResult {
  const t = { ...activeThresholds, ...thresholds };
  const failedDimensions: string[] = [];
  const reasonCodes: string[] = [];

  if (scores.sourceTrust < t.sourceTrust) {
    failedDimensions.push("sourceTrust");
    reasonCodes.push("LOW_SOURCE_TRUST");
  }
  if (scores.fieldCompleteness < t.fieldCompleteness) {
    failedDimensions.push("fieldCompleteness");
    reasonCodes.push("INCOMPLETE_FIELDS");
  }
  if (scores.taxonomyConfidence < t.taxonomyConfidence) {
    failedDimensions.push("taxonomyConfidence");
    reasonCodes.push("LOW_TAXONOMY_CONFIDENCE");
  }
  if (scores.mediaConfidence < t.mediaConfidence) {
    failedDimensions.push("mediaConfidence");
    reasonCodes.push("LOW_MEDIA_CONFIDENCE");
  }
  if (scores.dedupConfidence < t.dedupConfidence) {
    failedDimensions.push("dedupConfidence");
    reasonCodes.push("DUPLICATE_RISK");
  }
  if (scores.canonicalMappingConfidence < t.canonicalMappingConfidence) {
    failedDimensions.push("canonicalMappingConfidence");
    reasonCodes.push("WEAK_CANONICAL_MAPPING");
  }

  const overallScore =
    (scores.sourceTrust * 0.2 +
      scores.fieldCompleteness * 0.2 +
      scores.taxonomyConfidence * 0.2 +
      scores.mediaConfidence * 0.1 +
      scores.dedupConfidence * 0.15 +
      scores.canonicalMappingConfidence * 0.15);

  let decision: IngestionDecision;
  if (failedDimensions.length === 0) {
    decision = "accept";
  } else if (failedDimensions.length <= 2 && overallScore >= 0.5) {
    decision = "quarantine";
  } else {
    decision = "reject";
  }

  const result: IngestionResult = {
    entityId,
    decision,
    scores,
    failedDimensions,
    reasonCodes,
    overallScore: Math.round(overallScore * 1000) / 1000,
    timestamp: new Date().toISOString(),
  };

  ingestionLog.push(result);
  if (ingestionLog.length > MAX_LOG) {
    ingestionLog.splice(0, ingestionLog.length - MAX_LOG);
  }

  if (decision !== "accept") {
    const violation: ViolationReport = {
      id: `ing-${entityId}-${Date.now()}`,
      engine: "data",
      domain: "marketplace",
      severity: decision === "reject" ? "critical" : "warning",
      code: reasonCodes[0] ?? "INGESTION_FAILED",
      message: `Ingestion ${decision}: ${reasonCodes.join(", ")} (score=${result.overallScore})`,
      entityId,
      source: "ingestion-gate",
      detectedAt: result.timestamp,
      confidenceScore: overallScore,
      metadata: { scores, failedDimensions },
    };
    receiveViolation(violation);
  }

  const proof: ObservabilityProof = {
    id: `proof-ing-${entityId}-${Date.now()}`,
    source: "ingestion-gate",
    category: "ingestion",
    timestamp: result.timestamp,
    what: `Entity ${entityId} ingestion evaluated`,
    why: decision === "accept"
      ? "All dimensions passed thresholds"
      : `Failed dimensions: ${failedDimensions.join(", ")}`,
    where: "ingestion-gate",
    correction: decision === "quarantine"
      ? "Entity quarantined for review"
      : decision === "reject"
        ? "Entity rejected"
        : "none",
    fallbackUsed: false,
    rollbackUsed: false,
    recurrenceRisk: decision === "accept" ? "low" : "medium",
    metadata: { scores, decision, overallScore },
  };
  recordObservabilityProof(proof);

  platformBus.emit("enforcement:ingestion_evaluated", {
    entityId,
    decision,
    overallScore,
    failedDimensions,
  }, "system");

  return result;
}

export function enforceIngestionGate(
  entityId: string,
  scores: IngestionScores | null | undefined,
): { allowed: boolean; decision: IngestionDecision; reason: string } {
  if (!scores) {
    receiveViolation({
      id: `ing-gate-unscored-${entityId}-${Date.now()}`,
      engine: "data",
      domain: "marketplace",
      severity: "critical",
      code: "INGESTION_UNSCORED",
      message: `Entity ${entityId} blocked: no ingestion scores provided`,
      entityId,
      source: "ingestion-gate",
      detectedAt: new Date().toISOString(),
      suggestedAction: "block",
    });
    return { allowed: false, decision: "reject", reason: "No ingestion scores provided" };
  }

  const result = evaluateIngestion(entityId, scores);
  if (result.decision === "accept") {
    return { allowed: true, decision: "accept", reason: "All dimensions passed" };
  }

  return {
    allowed: false,
    decision: result.decision,
    reason: `Failed dimensions: ${result.failedDimensions.join(", ")} (score=${result.overallScore})`,
  };
}

export function getIngestionLog(limit = 100): IngestionResult[] {
  return ingestionLog.slice(-limit);
}

export function getIngestionStats(): {
  total: number;
  accepted: number;
  quarantined: number;
  rejected: number;
  avgScore: number;
  topReasonCodes: { code: string; count: number }[];
} {
  const accepted = ingestionLog.filter((r) => r.decision === "accept").length;
  const quarantined = ingestionLog.filter((r) => r.decision === "quarantine").length;
  const rejected = ingestionLog.filter((r) => r.decision === "reject").length;
  const avgScore = ingestionLog.length > 0
    ? Math.round(ingestionLog.reduce((s, r) => s + r.overallScore, 0) / ingestionLog.length * 1000) / 1000
    : 0;

  const codeMap: Record<string, number> = {};
  for (const r of ingestionLog) {
    for (const code of r.reasonCodes) {
      codeMap[code] = (codeMap[code] ?? 0) + 1;
    }
  }
  const topReasonCodes = Object.entries(codeMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([code, count]) => ({ code, count }));

  return {
    total: ingestionLog.length,
    accepted,
    quarantined,
    rejected,
    avgScore,
    topReasonCodes,
  };
}
