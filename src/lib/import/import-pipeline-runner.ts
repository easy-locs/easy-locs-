/**
 * Import Pipeline Runner — Orchestrates the full universal import pipeline.
 * SOURCE → ADAPTER → NORMALIZER → CANONICAL → DEDUP → MERGE → QUALITY → STORE → PROJECTION
 */
import type { Vertical, SourceEntityRecord } from "@/lib/onboarding/types";
import { detectDuplicates, mergeRecords, scoreQuality, type QualityReport, type MergeResult } from "./universal-import-engine";
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
  records: MergeResult[];
  qualityReports: Map<string, QualityReport>;
  duplicatesFound: number;
  sourcesQueried: string[];
  errors: Array<{ source: string; error: string }>;
  totalDurationMs: number;
}

export async function runUniversalImportPipeline(input: ImportPipelineInput): Promise<ImportPipelineResult> {
  const t0 = performance.now();

  // Step 1: Fetch from all allowed sources
  const fetchResult = await fetchFromSources({
    vertical: input.vertical,
    name: input.name,
    city: input.city,
    country: input.country,
    website: input.website,
    phone: input.phone,
    query: input.query,
  });

  // Step 2: Dedup
  const dedupMatches = detectDuplicates(fetchResult.records);

  // Step 3: Group duplicates into clusters
  const groups = groupByDuplicates(fetchResult.records, dedupMatches);

  // Step 4: Merge each cluster
  const mergeResults: MergeResult[] = groups.map(group => mergeRecords(group, input.vertical));

  // Step 5: Quality score each merged record
  const qualityReports = new Map<string, QualityReport>();
  for (const mr of mergeResults) {
    qualityReports.set(mr.merged.entityId, scoreQuality(mr.merged));
  }

  return {
    records: mergeResults,
    qualityReports,
    duplicatesFound: dedupMatches.length,
    sourcesQueried: fetchResult.sourcesQueried,
    errors: fetchResult.errors,
    totalDurationMs: Math.round(performance.now() - t0),
  };
}

function groupByDuplicates(records: SourceEntityRecord[], matches: ReturnType<typeof detectDuplicates>): SourceEntityRecord[][] {
  const idToGroup = new Map<string, number>();
  const groups: SourceEntityRecord[][] = [];

  for (const r of records) {
    if (!idToGroup.has(r.sourceEntityId)) {
      idToGroup.set(r.sourceEntityId, groups.length);
      groups.push([r]);
    }
  }

  for (const m of matches) {
    const gA = idToGroup.get(m.entityA);
    const gB = idToGroup.get(m.entityB);
    if (gA !== undefined && gB !== undefined && gA !== gB) {
      // Merge group B into group A
      groups[gA].push(...groups[gB]);
      const oldGroup = gB;
      for (const r of groups[oldGroup]) {
        idToGroup.set(r.sourceEntityId, gA);
      }
      groups[oldGroup] = [];
    }
  }

  return groups.filter(g => g.length > 0);
}
