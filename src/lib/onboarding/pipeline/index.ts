/**
 * Pipeline V2 — Public barrel export.
 * This is the ONLY import point for consumers.
 */
export { runPipelineV2 } from "./orchestrator";
export type {
  PipelineResult, RawInput, AuditTrace, PipelinePreview,
  QualityReport, GovernanceLayerOutput, PublishGateDecision,
  StorefrontPayload, PersistenceResult, StepState,
  InputLayerOutput, GeoLayerOutput, TaxonomyLayerOutput,
  MediaLayerOutput, EntityProfile,
} from "./contracts";
