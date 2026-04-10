/**
 * Import Pipeline Runner — DEPRECATED FACADE.
 * ================================================
 * Now delegates entirely to the canonical import engine.
 * Consumers should migrate to `import { runImportEngine } from "@/lib/import-engine"`.
 */
import { runImportEngine, type ImportResult, type SourceEntityRecord } from "@/lib/import-engine";
import type { Vertical } from "@/lib/onboarding/types";
import { fetchFromSources } from "@/lib/onboarding/micro/source.fetcher";

export interface ImportPipelineInput {
  vertical: Vertical;
  name?: string;
  city?: string;
  country?: string;
  website?: string;
  phone?: string;
  query?: string;
}

export interface ImportPipelineResult {
  entities: ImportResult["entities"];
  qualityReports: ImportResult["qualityReports"];
  publishDecisions: ImportResult["publishDecisions"];
  duplicatesFound: number;
  sourcesQueried: string[];
  errors: Array<{ source: string; error: string }>;
  totalDurationMs: number;
}

/**
 * Run the universal import pipeline.
 * DELEGATES to src/lib/import-engine/orchestrator.ts
 */
export async function runUniversalImportPipeline(input: ImportPipelineInput): Promise<ImportPipelineResult> {
  // Step 1: Fetch from sources (async, external I/O)
  const fetchResult = await fetchFromSources({
    vertical: input.vertical,
    name: input.name,
    city: input.city,
    country: input.country,
    website: input.website,
    phone: input.phone,
    query: input.query,
  });

  // Step 2: Delegate to canonical engine (pure, sync)
  const result = runImportEngine(
    { vertical: input.vertical as any, city: input.city, country: input.country },
    fetchResult.records as unknown as SourceEntityRecord[],
  );

  return {
    entities: result.entities,
    qualityReports: result.qualityReports,
    publishDecisions: result.publishDecisions,
    duplicatesFound: result.duplicatesFound,
    sourcesQueried: fetchResult.sourcesQueried,
    errors: fetchResult.errors,
    totalDurationMs: result.totalDurationMs,
  };
}
