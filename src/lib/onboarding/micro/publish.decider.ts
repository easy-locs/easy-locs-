/**
 * Publish Decider — Evaluates quality + publish gate for a canonical record.
 * ONE responsibility: produce a PublishDecision.
 */
import type { CanonicalOnboardingRecord } from "../types";
import { scoreOnboardingQuality } from "../onboarding-quality.engine";
import { evaluatePublishGate } from "../publish-gate.engine";
import type { PublishDecision } from "./pipeline.types";

export function decidePublish(record: CanonicalOnboardingRecord): PublishDecision {
  const quality = scoreOnboardingQuality(record);
  const gate = evaluatePublishGate(record, quality);

  return {
    entityId: record.entityId,
    allowed: gate.allowed,
    targetVisibility: gate.targetVisibility,
    reasons: gate.reasons,
    qualityScore: quality.score,
  };
}
