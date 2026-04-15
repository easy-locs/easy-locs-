import { runPipeline } from "./pipeline/orchestrator";
import { enqueueForReview } from "./review-queue.persistence";
import type { PipelineInput } from "./micro/pipeline.types";

export async function runOnboardingWithReview(input: PipelineInput) {
  const result = await runPipeline({
    raw: input.query ?? input.website ?? input.name ?? "",
    vertical: input.vertical,
    city: input.city,
    district: input.district,
    country: input.country,
    phone: input.phone,
    persist: true,
  });

  for (let i = 0; i < result.canonical.length; i++) {
    const record = result.canonical[i];
    const publish = result.publishDecisions.find((p) => p.entityId === record.entityId);
    const qr = result.qualityReports[i];
    const quality = {
      score: qr?.globalScore ?? 0,
      missingFields: qr?.missingFields ?? [],
      warnings: qr?.warnings ?? [],
      readyToPublish: qr?.readyToPublish ?? false,
    };

    if (!publish || publish.targetVisibility === "draft" || record.needsReview) {
      await enqueueForReview(
        record.entityId,
        record,
        quality,
        publish?.targetVisibility ?? "draft",
      );
    }
  }

  return {
    runId: result.runId,
    canonical: result.canonical,
    publish: result.publishDecisions,
    qualityReports: result.qualityReports,
    governanceOutputs: result.governanceOutputs,
    trace: result.trace,
  };
}
