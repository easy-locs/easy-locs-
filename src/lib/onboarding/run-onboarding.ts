/**
 * Run Onboarding — Entry point to run the full pipeline and persist results.
 */
import { runOnboardingPipeline } from "./onboarding-orchestrator";
import { persistOnboardingRun } from "./onboarding-persistence";
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
  const result = await runOnboardingPipeline(input);
  const runId = await persistOnboardingRun(input, result);
  return { runId, ...result };
}
