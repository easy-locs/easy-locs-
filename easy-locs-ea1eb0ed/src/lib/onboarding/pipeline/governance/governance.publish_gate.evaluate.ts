/**
 * governance.publish_gate.evaluate — Final publish decision.
 * Strict 2026 gate: requires media, valid geo, at least one contact method,
 * taxonomy confidence >= 0.7. Shops that fail go to draft with a clear reason.
 */
import type { PublishGateDecision, QualityReport, PolicyCheckResult } from "../contracts";

export interface PublishGateExtendedParams {
  entityId: string;
  quality: QualityReport;
  policy: PolicyCheckResult;
  hasLogo?: boolean;
  hasCover?: boolean;
  lat?: number | null;
  lng?: number | null;
  cityBoundsCheck?: boolean;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  taxonomyConfidence?: number;
}

export function evaluatePublishGate(params: {
  entityId: string;
  quality: QualityReport;
  policy: PolicyCheckResult;
}): PublishGateDecision {
  return evaluatePublishGateStrict({
    ...params,
  });
}

export function evaluatePublishGateStrict(params: PublishGateExtendedParams): PublishGateDecision {
  const reasons: string[] = [...params.policy.violations];

  if (!params.quality.readyToPublish) {
    reasons.push(`quality score ${params.quality.globalScore} insufficient (minimum 70)`);
  }

  for (const field of params.quality.missingFields) {
    reasons.push(`missing ${field}`);
  }

  const hasMedia = params.hasLogo || params.hasCover;
  if (!hasMedia) {
    reasons.push("requires at least 1 media asset (logo or cover image)");
  }

  const hasValidGeo = params.lat != null && params.lng != null &&
    !isNaN(params.lat) && !isNaN(params.lng) &&
    Math.abs(params.lat) <= 90 && Math.abs(params.lng) <= 180 &&
    !(params.lat === 0 && params.lng === 0);
  if (!hasValidGeo) {
    reasons.push("requires valid geo coordinates (non-zero lat/lng within world bounds)");
  }

  if (params.cityBoundsCheck === false) {
    reasons.push("geo coordinates fall outside declared city bounds");
  }

  const hasContact = Boolean(params.phone) || Boolean(params.email) || Boolean(params.website);
  if (!hasContact) {
    reasons.push("requires at least one verified contact method (phone, email, or website)");
  }

  const taxonomyConfidence = params.taxonomyConfidence ?? 1;
  const taxonomyOk = taxonomyConfidence >= 0.7;
  if (!taxonomyOk) {
    reasons.push(`taxonomy classification confidence ${(taxonomyConfidence * 100).toFixed(0)}% is below minimum 70%`);
  }

  const allowed =
    params.quality.readyToPublish &&
    params.policy.violations.length === 0 &&
    hasMedia &&
    hasValidGeo &&
    params.cityBoundsCheck !== false &&
    hasContact &&
    taxonomyOk;

  return {
    entityId: params.entityId,
    allowed,
    targetVisibility: allowed ? "public" : "draft",
    reasons,
    qualityScore: params.quality.globalScore,
    qualityReport: params.quality,
  };
}
