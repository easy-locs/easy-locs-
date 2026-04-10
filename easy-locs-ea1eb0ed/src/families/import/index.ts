/**
 * FAMILY: IMPORT — Canonical import pipeline.
 * Single source of truth for all import flows (contacts, media, merchants, CSV, onboarding).
 * Pipeline: SOURCE → PARSE → PREVIEW → DEDUP → EXECUTE → NOTIFY
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
export type { ImportSourceType, ImportSourceMeta } from "./import-source";
export { ImportParse } from "./import-parse";
export type { ParsedRow, ParseResult } from "./import-parse";
export { ImportPreview } from "./import-preview";
export type { PreviewEntry, PreviewResult } from "./import-preview";
export { ImportDedup } from "./import-dedup";
export type { DedupResult } from "./import-dedup";
export { ImportExecution } from "./import-execution";
export type { ExecutionItem, ExecutionProgress, ExecutionSummary } from "./import-execution";
export { ImportNotifications } from "./import-notifications";
export type { ImportNotification, ImportStatus } from "./import-notifications";

// Import family owns: source validation, parsing, preview, dedup, execution, notifications.
// No import should bypass preview/dedup.
