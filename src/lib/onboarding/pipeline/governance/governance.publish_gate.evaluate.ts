/**
 * governance.publish_gate.evaluate — Final publish decision.
 * ONE thing: produce allowed/denied with reasons.
 */
import type { PublishGateDecision, QualityReport, PolicyCheckResult } from "../contracts";

export function evaluatePublishGate(params: {
  entityId: string;
  quality: QualityReport;
  policy: PolicyCheckResult;
}): PublishGateDecision {
  const reasons: string[] = [...params.policy.violations];

  if (!params.quality.readyToPublish) {
    reasons.push(`quality score ${params.quality.globalScore} insufficient`);
  }

  for (const field of params.quality.missingFields) {
    reasons.push(`missing ${field}`);
  }

  const allowed = params.quality.readyToPublish && params.policy.violations.length === 0;

  return {
    entityId: params.entityId,
    allowed,
    targetVisibility: allowed ? "public" : "draft",
    reasons,
    qualityScore: params.quality.globalScore,
    qualityReport: params.quality,
  };
}
