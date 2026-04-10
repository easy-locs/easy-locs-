/**
 * Source Ingestion Orchestrator
 * Single entry point: source → parser → validation → coherence → ranking.
 * Extends the existing import pipeline — does NOT replace it.
 */
import type { CanonicalShopData } from "./parsers/canonical-format";
import { normalizeFromSource, type NormalizationResult } from "./source-normalization-engine";
import { checkDataIntegrity, autoRepairData, type IntegrityResult } from "./data-integrity-guard";
import { mergeMultipleSources, type MergeResult } from "./multi-source-merge-engine";
import { validateSource } from "./source-priority-engine";

export interface IngestionResult {
  entity_name: string;
  accepted: boolean;
  source_key: string;
  confidence: number;
  integrity_score: number;
  rejection_reason: string | null;
  warnings: string[];
  auto_fixes: string[];
  canonical_data: CanonicalShopData | null;
}

/**
 * Full ingestion pipeline for a single entity from a single source.
 * source → parse → validate → repair → integrity check
 */
export function ingestFromSource(
  sourceKey: string,
  vertical: string,
  rawData: any
): IngestionResult {
  // Step 1: Source validation + parsing
  const normalized = normalizeFromSource(sourceKey, vertical, rawData);

  if (!normalized.accepted || !normalized.data) {
    return {
      entity_name: rawData?.name || "unknown",
      accepted: false,
      source_key: sourceKey,
      confidence: normalized.confidence,
      integrity_score: 0,
      rejection_reason: normalized.rejection_reason,
      warnings: normalized.warnings,
      auto_fixes: [],
      canonical_data: null,
    };
  }

  // Step 2: Auto-repair
  const { repaired, fixes } = autoRepairData(normalized.data);

  // Step 3: Integrity check (includes coherence)
  const integrity = checkDataIntegrity(repaired);

  if (!integrity.passed) {
    const blockViolations = integrity.violations.filter(v => v.severity === "block");
    return {
      entity_name: repaired.name,
      accepted: false,
      source_key: sourceKey,
      confidence: normalized.confidence,
      integrity_score: integrity.score,
      rejection_reason: blockViolations.map(v => v.message).join("; "),
      warnings: [
        ...normalized.warnings,
        ...integrity.violations.filter(v => v.severity === "warn").map(v => v.message),
      ],
      auto_fixes: fixes,
      canonical_data: null,
    };
  }

  return {
    entity_name: repaired.name,
    accepted: true,
    source_key: sourceKey,
    confidence: normalized.confidence,
    integrity_score: integrity.score,
    rejection_reason: null,
    warnings: [
      ...normalized.warnings,
      ...integrity.violations.filter(v => v.severity === "warn").map(v => v.message),
    ],
    auto_fixes: [...fixes, ...integrity.auto_fixes],
    canonical_data: repaired,
  };
}

/**
 * Ingest from multiple sources for the same entity and merge.
 */
export function ingestAndMerge(
  vertical: string,
  sources: Array<{ source_key: string; raw_data: any }>
): { result: IngestionResult; merge_info: MergeResult | null } {
  // Parse each source
  const parsed = sources
    .map(s => ({ source_key: s.source_key, norm: normalizeFromSource(s.source_key, vertical, s.raw_data) }))
    .filter(s => s.norm.accepted && s.norm.data != null);

  if (parsed.length === 0) {
    return {
      result: {
        entity_name: sources[0]?.raw_data?.name || "unknown",
        accepted: false,
        source_key: sources[0]?.source_key || "unknown",
        confidence: 0,
        integrity_score: 0,
        rejection_reason: "All sources rejected",
        warnings: [],
        auto_fixes: [],
        canonical_data: null,
      },
      merge_info: null,
    };
  }

  // Merge if multiple
  let mergeInfo: MergeResult | null = null;
  let finalData: CanonicalShopData;
  let bestSource: string;

  if (parsed.length > 1) {
    mergeInfo = mergeMultipleSources(
      vertical,
      parsed.map(p => ({ source_key: p.source_key, data: p.norm.data! }))
    );
    finalData = mergeInfo.merged;
    bestSource = parsed[0].source_key;
  } else {
    finalData = parsed[0].norm.data!;
    bestSource = parsed[0].source_key;
  }

  // Auto-repair merged data
  const { repaired, fixes } = autoRepairData(finalData);
  const integrity = checkDataIntegrity(repaired);

  return {
    result: {
      entity_name: repaired.name,
      accepted: integrity.passed,
      source_key: bestSource,
      confidence: Math.max(...parsed.map(p => p.norm.confidence)),
      integrity_score: integrity.score,
      rejection_reason: integrity.passed ? null : integrity.violations.filter(v => v.severity === "block").map(v => v.message).join("; "),
      warnings: integrity.violations.filter(v => v.severity === "warn").map(v => v.message),
      auto_fixes: fixes,
      canonical_data: integrity.passed ? repaired : null,
    },
    merge_info: mergeInfo,
  };
}
