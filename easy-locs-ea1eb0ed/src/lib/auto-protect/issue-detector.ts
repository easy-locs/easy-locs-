import type { DetectedIssue, IssueCategory, ProtectionDomain, ProtectionSeverity } from "./types";
import type { RenderableEntity, RenderContract } from "@/lib/rendering/contracts";
import type { PipelineResult, MediaAsset } from "@/domains/content-pipeline/types";

let issueCounter = 0;

function nextId(): string {
  issueCounter++;
  return `issue_${Date.now()}_${issueCounter}`;
}

function createIssue(
  domain: ProtectionDomain,
  category: IssueCategory,
  severity: ProtectionSeverity,
  message: string,
  metadata: Record<string, unknown> = {},
  ids?: { entityId?: string; mediaAssetId?: string; userId?: string; route?: string },
): DetectedIssue {
  return {
    id: nextId(),
    domain,
    category,
    severity,
    message,
    metadata,
    detectedAt: new Date().toISOString(),
    ...ids,
  };
}

export function detectRenderMismatch(
  entity: RenderableEntity,
  contract: RenderContract,
): DetectedIssue | null {
  if (contract.canRender && !contract.shouldFlag) return null;

  if (contract.shouldHide) {
    return createIssue(
      "rendering",
      "render_mismatch",
      "high",
      `Entity ${entity.id} blocked from rendering: ${contract.fallbackReason}`,
      { vertical: entity.vertical, canonicalType: entity.canonicalType, reason: contract.fallbackReason },
      { entityId: entity.id },
    );
  }

  if (contract.shouldFlag) {
    return createIssue(
      "rendering",
      "render_mismatch",
      "medium",
      `Entity ${entity.id} flagged: ${contract.fallbackReason}`,
      { vertical: entity.vertical, canonicalType: entity.canonicalType, template: contract.allowedTemplate },
      { entityId: entity.id },
    );
  }

  return null;
}

export function detectTaxonomyMismatch(
  entityId: string,
  vertical: string,
  category: string,
  subcategory: string,
  canonicalType: string,
  canonicalPath: string,
): DetectedIssue | null {
  const pathParts = canonicalPath.split(".");
  if (pathParts[0] !== vertical) {
    return createIssue(
      "taxonomy",
      "cross_vertical",
      "critical",
      `Cross-vertical contamination: entity ${entityId} vertical="${vertical}" but path starts with "${pathParts[0]}"`,
      { vertical, category, subcategory, canonicalType, canonicalPath },
      { entityId },
    );
  }

  if (pathParts.length < 4) {
    return createIssue(
      "taxonomy",
      "taxonomy_mismatch",
      "high",
      `Incomplete canonical path for entity ${entityId}: "${canonicalPath}"`,
      { vertical, category, subcategory, canonicalType, canonicalPath },
      { entityId },
    );
  }

  return null;
}

export function detectMediaIssues(
  entityId: string,
  media: MediaAsset[],
  canonicalType: string,
): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  if (media.length === 0) {
    issues.push(createIssue(
      "media",
      "missing_data",
      "medium",
      `Entity ${entityId} has no media assets`,
      { canonicalType },
      { entityId },
    ));
  }

  const primary = media.filter((m) => m.isPrimary);
  if (media.length > 0 && primary.length === 0) {
    issues.push(createIssue(
      "media",
      "missing_data",
      "medium",
      `Entity ${entityId} has media but no primary designated`,
      { mediaCount: media.length, canonicalType },
      { entityId },
    ));
  }

  for (const asset of media) {
    if (asset.verificationStatus === "rejected" || asset.verificationStatus === "quarantined") {
      issues.push(createIssue(
        "media",
        "media_mismatch",
        asset.isPrimary ? "high" : "medium",
        `Media ${asset.id} on entity ${entityId} has status "${asset.verificationStatus}"`,
        { mediaId: asset.id, status: asset.verificationStatus, isPrimary: asset.isPrimary },
        { entityId, mediaAssetId: asset.id },
      ));
    }

    if (asset.entityMatchConfidence < 0.5) {
      issues.push(createIssue(
        "media",
        "media_mismatch",
        "medium",
        `Media ${asset.id} low entity match confidence: ${asset.entityMatchConfidence}`,
        { mediaId: asset.id, confidence: asset.entityMatchConfidence },
        { entityId, mediaAssetId: asset.id },
      ));
    }
  }

  return issues;
}

export function detectPipelineIssues(result: PipelineResult): DetectedIssue[] {
  const issues: DetectedIssue[] = [];

  if (result.quarantined) {
    const severity: ProtectionSeverity =
      result.quarantineReasons.includes("cross_vertical_contamination") ? "critical" :
      result.quarantineReasons.includes("canonical_conflict") ? "critical" :
      result.quarantineReasons.includes("taxonomy_conflict") ? "high" :
      result.quarantineReasons.includes("media_mismatch") ? "high" : "medium";

    issues.push(createIssue(
      "canonical",
      "canonical_conflict",
      severity,
      `Entity ${result.entityId} quarantined: ${result.quarantineReasons.join(", ")}`,
      {
        reasons: result.quarantineReasons,
        failedGates: result.gateResults.filter((g) => g.result === "fail").map((g) => g.gateId),
        confidenceScore: result.confidenceScore,
        confidenceBand: result.confidenceBand,
      },
      { entityId: result.entityId },
    ));
  }

  for (const gate of result.gateResults) {
    if (gate.result === "fail" && gate.gateId === "duplicate") {
      issues.push(createIssue(
        "canonical",
        "duplicate_content",
        "medium",
        `Duplicate detected for entity ${result.entityId}: ${gate.details}`,
        { gateId: gate.gateId, details: gate.details },
        { entityId: result.entityId },
      ));
    }
  }

  if (result.confidenceScore < 0.5) {
    issues.push(createIssue(
      "scraping",
      "low_confidence",
      "high",
      `Entity ${result.entityId} has rejected confidence: ${result.confidenceScore}`,
      { confidenceScore: result.confidenceScore, band: result.confidenceBand },
      { entityId: result.entityId },
    ));
  }

  return issues;
}

export function detectImportIssues(
  entityId: string,
  source: string,
  issues: string[],
  confidence: number,
): DetectedIssue[] {
  const detected: DetectedIssue[] = [];

  if (confidence < 0.5) {
    detected.push(createIssue(
      "scraping",
      "import_invalid",
      "high",
      `Import from ${source} for entity ${entityId} has low confidence: ${confidence}`,
      { source, confidence, rawIssues: issues },
      { entityId },
    ));
  }

  for (const issue of issues) {
    if (/image|media|photo/i.test(issue)) {
      detected.push(createIssue(
        "media",
        "media_mismatch",
        "medium",
        `Import media issue for ${entityId}: ${issue}`,
        { source, issue },
        { entityId },
      ));
    }

    if (/category|classification|vertical|type/i.test(issue)) {
      detected.push(createIssue(
        "taxonomy",
        "taxonomy_mismatch",
        "high",
        `Import taxonomy issue for ${entityId}: ${issue}`,
        { source, issue },
        { entityId },
      ));
    }
  }

  return detected;
}

export function detectWalletInconsistency(
  userId: string,
  issue: string,
  metadata: Record<string, unknown> = {},
): DetectedIssue {
  return createIssue(
    "wallet",
    "wallet_inconsistent",
    "critical",
    `Wallet inconsistency for user: ${issue}`,
    metadata,
    { userId },
  );
}

export function detectOtpAbuse(
  userId: string,
  attemptCount: number,
  windowMinutes: number,
): DetectedIssue | null {
  if (attemptCount <= 5) return null;

  return createIssue(
    "identity",
    "otp_abuse",
    attemptCount > 15 ? "critical" : "high",
    `OTP abuse pattern: ${attemptCount} attempts in ${windowMinutes} minutes`,
    { attemptCount, windowMinutes },
    { userId },
  );
}

export function detectSuspiciousAuth(
  userId: string,
  reason: string,
  metadata: Record<string, unknown> = {},
): DetectedIssue {
  return createIssue(
    "identity",
    "auth_suspicious",
    "high",
    `Suspicious auth pattern: ${reason}`,
    metadata,
    { userId },
  );
}

export function detectOrbitCorruption(
  conversationId: string,
  reason: string,
  metadata: Record<string, unknown> = {},
): DetectedIssue {
  return createIssue(
    "orbit",
    "thread_corrupt",
    "medium",
    `Thread corruption in ${conversationId}: ${reason}`,
    { conversationId, ...metadata },
  );
}

export function detectPublicPageInvalid(
  entityId: string,
  route: string,
  reason: string,
): DetectedIssue {
  return createIssue(
    "public_seo",
    "public_invalid",
    "high",
    `Invalid public page for entity ${entityId} at ${route}: ${reason}`,
    { route, reason },
    { entityId, route },
  );
}

export function detectCardBroken(
  entityId: string,
  component: string,
  reason: string,
  metadata: Record<string, unknown> = {},
): DetectedIssue {
  return createIssue(
    "ui",
    "card_broken",
    "medium",
    `Broken card in ${component} for entity ${entityId}: ${reason}`,
    { component, reason, ...metadata },
    { entityId },
  );
}
