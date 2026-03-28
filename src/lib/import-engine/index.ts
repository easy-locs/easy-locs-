/**
 * Import Engine — Public API
 * ===========================
 * Single entry point for all consumers.
 * This is the ONLY file external code should import from.
 */

// ─── Orchestrator ───
export { runImportEngine } from "./orchestrator";

// ─── Types ───
export type {
  Vertical,
  SourceName,
  TaxonomyNode,
  EntityStatus,
  SourceEvidence,
  SourceEntityRecord,
  CanonicalEntity,
  QualityReport,
  PublishDecision,
  DedupMatch,
  ImportInput,
  ImportResult,
  PipelineTrace,
  PipelineStep,
} from "./types";

// ─── Taxonomy ───
export { mapToTaxonomy, isTaxonomyComplete } from "./taxonomy/taxonomy-mapper";

// ─── Source Policy ───
export { getPolicy, isSourceAllowed, isSourceForbidden, getPrimarySources } from "./source-policy/source-policy";
export { getFieldPriority } from "./source-policy/field-priority";

// ─── Dedup ───
export { detectDuplicates, groupByDuplicates, computeDedupScore } from "./dedup/dedup-engine";

// ─── Merge ───
export { mergeCluster } from "./merge/merge-engine";

// ─── Enrichment ───
export { autoEnrich } from "./enrichment/auto-enricher";
export { generateSlug, generateSeoTitle, generateSeoDescription } from "./enrichment/seo-enricher";

// ─── Quality ───
export { scoreQuality } from "./quality/quality-scorer";
export { evaluatePublishGate } from "./quality/publish-gate";

// ─── Classifier ───
export { classifyVertical } from "./classifier/vertical-classifier";
export type { ClassificationInput, ClassificationResult } from "./classifier/vertical-classifier";
