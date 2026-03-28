/**
 * Run Onboarding — Entry point for V2 pipeline. Backward-compatible.
 */
import { runPipelineV2 } from "./pipeline";
import type { Vertical } from "./types";

export async function runAndPersistOnboarding(input: {
  vertical: Vertical;
  name?: string;
  city?: string;
  district?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}) {
  const result = await runPipelineV2({
    raw: input.website ?? input.name ?? input.query ?? "",
    vertical: input.vertical,
    city: input.city,
    district: input.district,
    country: input.country,
    phone: input.phone,
    persist: true,
  });

  return {
    runId: result.runId,
    canonical: result.canonical,
    publish: result.publishDecisions,
    trace: result.trace,
    qualityReports: result.qualityReports,
    governance: result.governanceOutputs,
    preview: result.preview,
  };
}
