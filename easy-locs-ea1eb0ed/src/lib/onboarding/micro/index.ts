/**
 * Micro-engine barrel export — Single import point for all atomic units.
 */
export { validatePipelineInput } from "./input.validator";
export { normalizeText, normalizeTextArray } from "./text.normalizer";
export { dedupePhotos } from "./photo.deduplicator";
export { dedupeNamedItems } from "./item.deduplicator";
export { sanitizeCanonicalRecord } from "./record.sanitizer";
export { fetchFromSources } from "./source.fetcher";
export { decidePublish } from "./publish.decider";
export { runStep, runStepSync, logPipelineTrace } from "./pipeline.logger";
export type {
  PipelineInput,
  InputValidationResult,
  SourceFetchResult,
  GroupingResult,
  SanitizationResult,
  StepResult,
  PipelineTrace,
  PublishDecision,
} from "./pipeline.types";
