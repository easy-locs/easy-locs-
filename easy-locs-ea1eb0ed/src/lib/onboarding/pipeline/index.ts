/**
 * Pipeline — Public barrel export.
 * This is the ONLY import point for consumers.
 */
export { runPipeline } from "./orchestrator";
export type {
  PipelineResult, RawInput, AuditTrace, PipelinePreview,
  QualityReport, GovernanceLayerOutput, PublishGateDecision,
  StorefrontPayload, PersistenceResult, StepState,
  InputLayerOutput, GeoLayerOutput, TaxonomyLayerOutput,
  MediaLayerOutput, EntityProfile,
} from "./contracts";
