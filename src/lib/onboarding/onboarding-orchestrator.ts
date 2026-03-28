/**
 * Onboarding Orchestrator — Thin coordinator that delegates to atomic micro-engines.
 * NO business logic here. Each step is isolated, logged, and traceable.
 */
import { validatePipelineInput } from "./micro/input.validator";
import { fetchFromSources } from "./micro/source.fetcher";
import { sanitizeCanonicalRecord } from "./micro/record.sanitizer";
import { decidePublish } from "./micro/publish.decider";
import { runStep, logPipelineTrace } from "./micro/pipeline.logger";
import type { PipelineInput, PipelineTrace, PublishDecision } from "./micro/pipeline.types";
import { groupEntities } from "./entity-resolution.engine";
import { mergeEntityRecords } from "./field-merge.engine";
import { fillMissingWithWebFallback } from "./web-fallback.engine";
import type { CanonicalOnboardingRecord } from "./types";

// Re-export for backward compatibility
export type OnboardingRequest = PipelineInput;

export interface OnboardingPipelineResult {
  canonical: CanonicalOnboardingRecord[];
  publish: PublishDecision[];
  trace: PipelineTrace;
}

export async function runOnboardingPipeline(
  input: PipelineInput,
): Promise<OnboardingPipelineResult> {
  const pipelineId = crypto.randomUUID();
  const pipelineStart = performance.now();
  const traceSteps: PipelineTrace["steps"] = [];

  // Step 1: Validate input
  const validation = await runStep("input.validator", input, async () =>
    validatePipelineInput(input),
  );
  traceSteps.push({ name: "input.validator", durationMs: validation.durationMs, success: true });

  if (!validation.data.valid) {
    const trace: PipelineTrace = {
      pipelineId,
      input,
      steps: traceSteps,
      totalDurationMs: Math.round(performance.now() - pipelineStart),
      completedAt: new Date().toISOString(),
    };
    logPipelineTrace(trace);
    return { canonical: [], publish: [], trace };
  }

  const sanitizedInput = validation.data.sanitizedInput;

  // Step 2: Fetch from sources
  const fetchResult = await runStep("source.fetcher", sanitizedInput, () =>
    fetchFromSources(sanitizedInput),
  );
  traceSteps.push({
    name: "source.fetcher",
    durationMs: fetchResult.durationMs,
    success: true,
    outputSummary: `${fetchResult.data.records.length} records from ${fetchResult.data.sourcesQueried.join(",")}`,
  });

  // Step 3: Entity grouping
  const groupResult = await runStep("entity.grouper", { count: fetchResult.data.records.length }, async () =>
    groupEntities(fetchResult.data.records),
  );
  traceSteps.push({
    name: "entity.grouper",
    durationMs: groupResult.durationMs,
    success: true,
    outputSummary: `${groupResult.data.length} groups`,
  });

  // Step 4-6: Per-group: merge → fallback → sanitize
  const canonicalResults: CanonicalOnboardingRecord[] = [];

  for (let i = 0; i < groupResult.data.length; i++) {
    const group = groupResult.data[i];

    // Step 4: Field merge
    const mergeResult = await runStep(`field.merger[${i}]`, { groupSize: group.length }, async () =>
      mergeEntityRecords(sanitizedInput.vertical, group),
    );
    traceSteps.push({ name: `field.merger[${i}]`, durationMs: mergeResult.durationMs, success: true });

    // Step 5: Web fallback (conditional)
    let finalGroup = [...group];
    if (mergeResult.data.missingFields.length > 0) {
      const fallbackResult = await runStep(`web.fallback[${i}]`, { missing: mergeResult.data.missingFields }, async () =>
        fillMissingWithWebFallback(sanitizedInput.vertical, {
          name: mergeResult.data.canonicalName,
          city: mergeResult.data.city,
          district: mergeResult.data.district,
          country: mergeResult.data.country,
          website: mergeResult.data.website,
          phone: mergeResult.data.phone,
        }),
      );
      traceSteps.push({ name: `web.fallback[${i}]`, durationMs: fallbackResult.durationMs, success: true });
      finalGroup = [...finalGroup, ...fallbackResult.data];
    }

    // Re-merge with fallback data
    const finalMerge = mergeEntityRecords(sanitizedInput.vertical, finalGroup);

    // Step 6: Sanitize
    const sanitizeResult = await runStep(`record.sanitizer[${i}]`, { entityId: finalMerge.entityId }, async () =>
      sanitizeCanonicalRecord(finalMerge),
    );
    traceSteps.push({ name: `record.sanitizer[${i}]`, durationMs: sanitizeResult.durationMs, success: true });

    canonicalResults.push(sanitizeResult.data);
  }

  // Step 7: Publish decisions
  const publishResult = await runStep("publish.decider", { count: canonicalResults.length }, async () =>
    canonicalResults.map(decidePublish),
  );
  traceSteps.push({
    name: "publish.decider",
    durationMs: publishResult.durationMs,
    success: true,
    outputSummary: `${publishResult.data.filter((p) => p.allowed).length}/${publishResult.data.length} allowed`,
  });

  const trace: PipelineTrace = {
    pipelineId,
    input: sanitizedInput,
    steps: traceSteps,
    totalDurationMs: Math.round(performance.now() - pipelineStart),
    completedAt: new Date().toISOString(),
  };

  logPipelineTrace(trace);

  return { canonical: canonicalResults, publish: publishResult.data, trace };
}
