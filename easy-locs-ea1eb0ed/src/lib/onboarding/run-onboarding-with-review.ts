import { runOnboardingPipeline } from "./onboarding-orchestrator";
import { persistOnboardingRun } from "./onboarding-persistence";
import { enqueueForReview } from "./review-queue.persistence";
import { scoreOnboardingQuality } from "./onboarding-quality.engine";
import type { OnboardingRequest } from "./onboarding-orchestrator";

export async function runOnboardingWithReview(input: OnboardingRequest) {
  const result = await runOnboardingPipeline(input);
  const runId = await persistOnboardingRun(input, result);

  for (const record of result.canonical) {
    const publish = result.publish.find((p) => p.entityId === record.entityId);
    const quality = scoreOnboardingQuality(record);

    if (!publish || publish.targetVisibility === "draft" || record.needsReview) {
      await enqueueForReview(
        record.entityId,
        record,
        quality,
        publish?.targetVisibility ?? "draft",
      );
    }
  }

  return { runId, canonical: result.canonical, publish: result.publish };
}
