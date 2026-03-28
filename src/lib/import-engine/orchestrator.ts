/**
 * Import Engine Orchestrator — Single entry point for the full pipeline.
 * SOURCE → DEDUP → MERGE → TAXONOMY → ENRICH → QUALITY → GATE → OUTPUT
 *
 * Microservice-ready: this module has ZERO external dependencies.
 * All I/O (DB, network) is injected via SourceEntityRecord[].
 */
import type {
  ImportInput,
  ImportResult,
  SourceEntityRecord,
  CanonicalEntity,
  QualityReport,
  PublishDecision,
  PipelineTrace,
  PipelineStep,
} from "./types";
import { detectDuplicates, groupByDuplicates } from "./dedup/dedup-engine";
import { mergeCluster } from "./merge/merge-engine";
import { autoEnrich } from "./enrichment/auto-enricher";
import { scoreQuality } from "./quality/quality-scorer";
import { evaluatePublishGate } from "./quality/publish-gate";

function stepTimer(name: string): { finish: (success: boolean, counts?: { input?: number; output?: number }, error?: string) => PipelineStep } {
  const t0 = performance.now();
  return {
    finish: (success, counts, error) => ({
      name,
      durationMs: Math.round(performance.now() - t0),
      success,
      inputCount: counts?.input,
      outputCount: counts?.output,
      error,
    }),
  };
}

/**
 * Run the full import pipeline on a batch of source records.
 * Pure function — no DB, no network, no side effects.
 */
export function runImportEngine(
  input: ImportInput,
  records: SourceEntityRecord[],
): ImportResult {
  const t0 = performance.now();
  const pipelineId = crypto.randomUUID();
  const steps: PipelineStep[] = [];

  // Step 1: Dedup
  const dedupTimer = stepTimer("dedup");
  const matches = detectDuplicates(records);
  const groups = groupByDuplicates(records, matches);
  steps.push(dedupTimer.finish(true, { input: records.length, output: groups.length }));

  // Step 2: Merge
  const mergeTimer = stepTimer("merge");
  const entities: CanonicalEntity[] = [];
  for (const group of groups) {
    const { entity } = mergeCluster(group, input.vertical);
    entities.push(entity);
  }
  steps.push(mergeTimer.finish(true, { input: groups.length, output: entities.length }));

  // Step 3: Enrich
  const enrichTimer = stepTimer("enrich");
  for (const entity of entities) {
    autoEnrich(entity);
  }
  steps.push(enrichTimer.finish(true, { input: entities.length, output: entities.length }));

  // Step 4: Quality scoring
  const qualityTimer = stepTimer("quality");
  const qualityReports = new Map<string, QualityReport>();
  for (const entity of entities) {
    qualityReports.set(entity.entityId, scoreQuality(entity));
  }
  steps.push(qualityTimer.finish(true, { input: entities.length, output: qualityReports.size }));

  // Step 5: Publish gate
  const gateTimer = stepTimer("publish_gate");
  const publishDecisions = new Map<string, PublishDecision>();
  for (const entity of entities) {
    const quality = qualityReports.get(entity.entityId)!;
    const decision = evaluatePublishGate(entity, quality);
    publishDecisions.set(entity.entityId, decision);
    entity.status = decision.targetStatus;
  }
  steps.push(gateTimer.finish(true, { input: entities.length, output: publishDecisions.size }));

  const trace: PipelineTrace = {
    pipelineId,
    input,
    steps,
    totalDurationMs: Math.round(performance.now() - t0),
    completedAt: new Date().toISOString(),
  };

  return {
    entities,
    qualityReports,
    publishDecisions,
    duplicatesFound: matches.length,
    sourcesQueried: [...new Set(records.map(r => r.source))],
    errors: [],
    totalDurationMs: trace.totalDurationMs,
    trace,
  };
}
