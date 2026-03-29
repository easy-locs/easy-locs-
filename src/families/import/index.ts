/**
 * FAMILY: IMPORT — Canonical import pipeline.
 * Single source of truth for all import flows (contacts, media, merchants, CSV, onboarding).
 * Pipeline: SOURCE → PARSE → PREVIEW → DEDUP → EXECUTE
 */

// ── Import Engine (canonical orchestrator) ──
export {
  runImportEngine,
  type Vertical,
  type SourceEntityRecord,
  type ImportResult,
  type CanonicalEntity,
  type DedupMatch,
  type QualityReport,
} from "@/lib/import-engine";

// ── Subfamilies ──
export { ImportSource } from "./import-source";
export { ImportParse } from "./import-parse";
export { ImportPreview } from "./import-preview";
export { ImportDedup } from "./import-dedup";

// Import family owns: source validation, parsing, preview, dedup, execution.
// No import should bypass preview/dedup.
